"""
Federated Learning Server for FDRL Traffic Control
Aggregates model updates from multiple junction clients
"""

import socket
import pickle
import torch
import json
import numpy as np
from collections import OrderedDict
from ppo_agent import PPOAgent
from lightning.fabric import Fabric
import os


class FederatedServer:
    def __init__(self, config, ready_event=None):
        self.config = config
        self.ready_event = ready_event

        # Initialize Fabric for distributed training
        self.fabric = Fabric(accelerator="auto", devices=1)
        self.fabric.launch()

        self.host = config["system"]["server_host"]
        self.port = config["system"]["server_port"]
        self.num_clients = len(config["system"]["controlled_junctions"])
        self.max_roads = config["system"]["max_roads"]

        # Universal model dimensions (padded)
        self.state_dim = 2 * self.max_roads
        self.action_dim = self.max_roads

        print(f"\n{'=' * 60}")
        print(f"SERVER: UNIVERSAL MODEL")
        print(f"{'=' * 60}")
        print(f"State Dim: {self.state_dim} | Action Dim: {self.action_dim}")
        print(f"Clients: {self.num_clients}")
        print(f"{'=' * 60}\n")

        # Initialize global agent
        self.global_agent = PPOAgent(
            self.state_dim, self.action_dim, config, fabric=self.fabric
        )
        self.alpha = config["fdrl"]["alpha"]
        self.log_file = config["system"]["log_file"]
        self.logs = []

        self.client_sockets = []
        self.client_names = []
        self.device = self.fabric.device

    def start(self):
        # Setup server socket
        server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server_socket.bind((self.host, self.port))
        server_socket.listen(self.num_clients)

        print(f"Server listening on {self.host}:{self.port}")
        print(f"Waiting for {self.num_clients} clients...\n")

        if self.ready_event:
            self.ready_event.set()

        # Accept client connections
        for i in range(self.num_clients):
            client_socket, addr = server_socket.accept()
            meta_data = pickle.loads(client_socket.recv(4096))
            self.client_sockets.append(client_socket)
            self.client_names.append(meta_data["junction_id"])
            print(
                f"✓ Client {i + 1}/{self.num_clients}: {meta_data['junction_id'][:30]}"
            )

        print(f"\n{'=' * 60}")
        print("All clients connected! Starting training...")
        print(f"{'=' * 60}\n")

        # Training loop
        for epoch in range(self.config["fdrl"]["epochs"]):
            # Broadcast global weights to all clients
            global_weights = self.global_agent.actor.state_dict()

            for client_socket in self.client_sockets:
                # Send weights (move to CPU for serialization)
                data = pickle.dumps({k: v.cpu() for k, v in global_weights.items()})
                client_socket.sendall(len(data).to_bytes(8, "big"))
                client_socket.sendall(data)

            # Collect client updates
            client_weights = []
            epoch_rewards = []
            epoch_actor_losses = []
            epoch_critic_losses = []

            for i, client_socket in enumerate(self.client_sockets):
                data_size = int.from_bytes(client_socket.recv(8), "big")
                received_data = b""
                while len(received_data) < data_size:
                    received_data += client_socket.recv(4096)

                payload = pickle.loads(received_data)
                client_weights.append(payload["weights"])
                epoch_rewards.append(payload["log"]["cumulative_reward"])
                epoch_actor_losses.append(payload["log"]["actor_loss"])
                epoch_critic_losses.append(payload["log"]["critic_loss"])

            # Aggregate client weights (FedAvg)
            aggregated_weights = OrderedDict()
            for key in client_weights[0].keys():
                stacked = torch.stack([w[key].to(self.device) for w in client_weights])
                aggregated_weights[key] = torch.mean(stacked, dim=0)

            # Update global model with momentum
            current_weights = self.global_agent.actor.state_dict()
            for key in current_weights.keys():
                current_weights[key] = (1 - self.alpha) * aggregated_weights[
                    key
                ] + self.alpha * current_weights[key]

            self.global_agent.actor.load_state_dict(current_weights)

            # Logging
            avg_reward = np.mean(epoch_rewards)
            avg_actor_loss = np.mean(epoch_actor_losses)
            avg_critic_loss = np.mean(epoch_critic_losses)

            self.logs.append(
                {
                    "epoch": epoch + 1,
                    "cumulative_reward": float(avg_reward),
                    "actor_loss": float(avg_actor_loss),
                    "critic_loss": float(avg_critic_loss),
                }
            )
            print(
                f"Epoch {epoch + 1}/{self.config['fdrl']['epochs']}: "
                f"R={avg_reward:.2f}, AL={avg_actor_loss:.4f}, CL={avg_critic_loss:.4f}"
            )

            # Save checkpoints
            if (epoch + 1) % 50 == 0:
                os.makedirs("saved_models", exist_ok=True)
                torch.save(
                    self.global_agent.actor.state_dict(),
                    "saved_models/universal_model.pth",
                )
                with open(self.log_file, "w") as f:
                    json.dump(self.logs, f, indent=2)
                print(f"  → Checkpoint saved (epoch {epoch + 1})")

        # Save final model
        torch.save(
            self.global_agent.actor.state_dict(), "saved_models/universal_model.pth"
        )
        with open(self.log_file, "w") as f:
            json.dump(self.logs, f, indent=2)

        print(f"\n{'=' * 60}")
        print("Training complete!")
        print(f"Model saved: saved_models/universal_model.pth")
        print(f"Logs saved: {self.log_file}")
        print(f"{'=' * 60}\n")

        # Cleanup
        for client_socket in self.client_sockets:
            try:
                client_socket.close()
            except:
                pass
        server_socket.close()
