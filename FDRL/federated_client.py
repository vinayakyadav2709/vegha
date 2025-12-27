"""
Federated Learning Client for Junction-Level Training
Each client trains independently on its junction and sends updates to server
"""

import socket
import pickle
import torch
import numpy as np
import time
import traci
from torch.distributions import Categorical
from ppo_agent import PPOAgent, Memory
from sumo_simulator import SumoSimulator
from lightning.fabric import Fabric


class FederatedClient:
    def __init__(self, junction_info, config):
        self.junction_id = junction_info["id"]
        self.incoming_roads = junction_info["incoming_roads"]
        self.actual_action_dim = len(self.incoming_roads)
        self.max_roads = config["system"]["max_roads"]

        # Universal model dimensions (padded)
        self.state_dim = 2 * self.max_roads
        self.action_dim = self.max_roads
        self.config = config

        print(f"\n{'=' * 50}")
        print(f"CLIENT: {self.junction_id[:30]}")
        print(f"{'=' * 50}")
        print(f"Junction Type: {self.actual_action_dim}-way")
        print(f"Model Dims: {self.action_dim} actions (universal)")
        print(f"{'=' * 50}\n")

        # Initialize Fabric and agent
        self.fabric = Fabric(accelerator="auto", devices=1)
        self.fabric.launch()

        self.agent = PPOAgent(
            self.state_dim, self.action_dim, config, fabric=self.fabric
        )
        self.memory = Memory()

        # Server connection setup
        self.server_host = config["system"]["server_host"]
        self.server_port = config["system"]["server_port"]
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)

    def connect_to_server(self):
        """Connect to federated server with retry logic."""
        max_retries = 15
        retry_delay = 2

        for attempt in range(max_retries):
            try:
                self.socket.connect((self.server_host, self.server_port))
                print(f"✓ Client {self.junction_id[:20]} connected")

                # Send metadata to server
                meta_data = {
                    "junction_id": self.junction_id,
                    "state_dim": self.state_dim,
                    "action_dim": self.actual_action_dim,
                }
                self.socket.sendall(pickle.dumps(meta_data))
                return

            except ConnectionRefusedError:
                if attempt < max_retries - 1:
                    print(
                        f"  Client {self.junction_id[:20]}: Retry {attempt + 1}/{max_retries}..."
                    )
                    time.sleep(retry_delay)
                else:
                    raise ConnectionRefusedError(
                        f"Failed to connect after {max_retries} attempts"
                    )

    def select_action_with_masking(self, state):
        """
        Select action using universal model with action masking.
        Masks out padded actions (beyond actual number of roads).
        """
        state_tensor = torch.FloatTensor(state).to(self.fabric.device)

        with torch.no_grad():
            action_probs = self.agent.actor_old(state_tensor)

            # Create mask: 1 for valid actions, 0 for padded
            mask = torch.zeros(self.action_dim, device=self.fabric.device)
            mask[: self.actual_action_dim] = 1.0

            # Apply mask and renormalize
            masked_probs = action_probs * mask
            masked_probs = masked_probs / (masked_probs.sum() + 1e-10)

            dist = Categorical(masked_probs)
            action = dist.sample()
            action_log_prob = dist.log_prob(action)

            return action.item(), action_log_prob.item()

    def run(self):
        """Main training loop for federated client."""
        self.connect_to_server()

        # Initialize simulator ONCE before all epochs
        sim = SumoSimulator(
            self.config["sumo"]["config_file"],
            self.config,
            step_length=self.config["sumo"]["step_length"],
            gui=False,
        )

        print(f"✓ Simulation started for {self.junction_id[:20]}")

        # Training epochs - simulation continues throughout
        for epoch in range(self.config["fdrl"]["epochs"]):
            # Receive global model weights
            data_size_bytes = self.socket.recv(8)
            if not data_size_bytes:
                break

            data_size = int.from_bytes(data_size_bytes, "big")
            received_data = b""
            while len(received_data) < data_size:
                received_data += self.socket.recv(4096)

            global_weights = pickle.loads(received_data)
            global_weights = {
                k: v.to(self.fabric.device) for k, v in global_weights.items()
            }

            # Update local model
            self.agent.actor.load_state_dict(global_weights)
            self.agent.actor_old.load_state_dict(global_weights)

            # Local training for K steps
            cumulative_reward = 0
            steps_completed = 0

            for k_step in range(self.config["fdrl"]["K"]):
                # Check if simulation still has vehicles
                if traci.simulation.getMinExpectedNumber() <= 0:
                    print(f"  ↻ Restarting simulation for {self.junction_id}...")
                    sim.close()
                    sim = SumoSimulator(
                        self.config["sumo"]["config_file"],
                        self.config,
                        step_length=self.config["sumo"]["step_length"],
                        gui=False,
                    )
                    continue

                # Get state
                state = sim.get_state(self.junction_id)

                # Select action
                action, log_prob = self.select_action_with_masking(state)

                # Store experience
                self.memory.states.append(state)
                self.memory.actions.append(action)
                self.memory.logprobs.append(log_prob)

                # Execute action
                sim.set_phase(
                    self.junction_id,
                    action,
                    self.config["fdrl"]["yellow_time"],
                    self.config["fdrl"]["green_time"],
                )

                # Get reward
                reward = sim.get_reward(self.junction_id)
                self.memory.rewards.append(reward)
                self.memory.is_terminals.append(False)
                cumulative_reward += reward
                steps_completed += 1

            # CRITICAL: Only update if we have experiences
            if len(self.memory.states) > 0:
                loss, actor_loss, critic_loss = self.agent.update(self.memory)
                self.memory.clear_memory()
            else:
                loss, actor_loss, critic_loss = 0.0, 0.0, 0.0
                cumulative_reward = 0.0

            # Send update to server
            payload = {
                "weights": {
                    k: v.cpu() for k, v in self.agent.actor.state_dict().items()
                },
                "log": {
                    "cumulative_reward": cumulative_reward,
                    "actor_loss": actor_loss,
                    "critic_loss": critic_loss,
                },
            }

            data_bytes = pickle.dumps(payload)
            self.socket.sendall(len(data_bytes).to_bytes(8, "big"))
            self.socket.sendall(data_bytes)

            if epoch % 10 == 0 or epoch == 0:
                print(
                    f"  Epoch {epoch + 1}: R={cumulative_reward:.2f} ({steps_completed}/{self.config['fdrl']['K']} steps)"
                )

        # Cleanup
        sim.close()
        self.socket.close()
        print(f"✓ Client {self.junction_id[:20]} training complete")
