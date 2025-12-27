import socket
import pickle
import threading
import torch
import json
import numpy as np
from collections import OrderedDict
from ppo_agent import PPOAgent
from lightning.fabric import Fabric
import os

class FederatedServer:
    def __init__(self, config):
        self.config = config
        
        # Initialize Fabric
        self.fabric = Fabric(accelerator="auto", devices=1)
        self.fabric.launch()
        
        self.host = config['system']['server_host']
        self.port = config['system']['server_port']
        self.num_clients = len(config['system']['controlled_junctions'])
        
        self.global_agent = None 
        
        self.client_sockets = []
        self.client_weights = {}
        self.epoch_logs = {}
        self.training_logs = []
        
        self.lock = threading.Lock()
        self.barrier = threading.Barrier(self.num_clients, action=self.locked_aggregate_and_log)

    def _initialize_global_agent(self, state_dim, action_dim):
        if self.global_agent is None:
            print(f"Initializing global agent with state_dim={state_dim}, action_dim={action_dim}")
            self.global_agent = PPOAgent(state_dim, action_dim, self.config, fabric=self.fabric)

    def locked_aggregate_and_log(self):
        with self.lock:
            print("\n--- Barrier Reached: Aggregating models ---")
            
            alpha = self.config['fdrl']['alpha']
            global_state_dict = self.global_agent.actor.state_dict()
            aggregated_state_dict = OrderedDict([(key, alpha * global_state_dict[key]) for key in global_state_dict])

            num_clients_in_round = len(self.client_weights)
            if num_clients_in_round > 0:
                aggregation_weight_p_i = 1.0 / num_clients_in_round
                for local_state_dict in self.client_weights.values():
                    for key in local_state_dict:
                        # Move to device if needed
                        if self.fabric:
                            local_tensor = local_state_dict[key].to(self.fabric.device)
                        else:
                            local_tensor = local_state_dict[key]
                        aggregated_state_dict[key] += (1 - alpha) * aggregation_weight_p_i * local_tensor
                
                self.global_agent.actor.load_state_dict(aggregated_state_dict)
                self.global_agent.actor_old.load_state_dict(aggregated_state_dict)
                print("Global model aggregated successfully.")

            if self.epoch_logs:
                avg_reward = np.mean([log['cumulative_reward'] for log in self.epoch_logs.values()])
                avg_actor_loss = np.mean([log['actor_loss'] for log in self.epoch_logs.values()])
                avg_critic_loss = np.mean([log['critic_loss'] for log in self.epoch_logs.values()])

                current_epoch = len(self.training_logs) + 1
                epoch_log = {
                    "epoch": current_epoch,
                    "cumulative_reward": avg_reward,
                    "actor_loss": avg_actor_loss,
                    "critic_loss": avg_critic_loss
                }
                self.training_logs.append(epoch_log)
                print(f"Epoch {current_epoch} Summary: Avg Reward={avg_reward:.2f}, "
                      f"Avg Actor Loss={avg_actor_loss:.4f}, Avg Critic Loss={avg_critic_loss:.4f}\n")
            
            self.client_weights.clear()
            self.epoch_logs.clear()

    def handle_client(self, client_socket, client_address):
        print(f"Accepted connection from {client_address}")
        try:
            meta_data_bytes = client_socket.recv(1024)
            meta_data = pickle.loads(meta_data_bytes)
            client_id = meta_data['junction_id']
            
            with self.lock:
                if self.global_agent is None:
                    self._initialize_global_agent(meta_data['state_dim'], meta_data['action_dim'])

            for epoch in range(self.config['fdrl']['epochs']):
                with self.lock:
                    global_weights = {k: v.cpu() for k, v in self.global_agent.actor.state_dict().items()}
                data_bytes = pickle.dumps(global_weights)
                client_socket.sendall(len(data_bytes).to_bytes(8, 'big'))
                client_socket.sendall(data_bytes)
                
                data_size = int.from_bytes(client_socket.recv(8), 'big')
                received_data = b""
                while len(received_data) < data_size:
                    chunk = client_socket.recv(4096)
                    if not chunk: break
                    received_data += chunk
                
                if not received_data: break
                payload = pickle.loads(received_data)
                
                with self.lock:
                    self.client_weights[client_id] = payload['weights']
                    self.epoch_logs[client_id] = payload['log']
                    print(f"Received model from {client_id} for epoch {epoch+1}.")

                try:
                    self.barrier.wait()
                except threading.BrokenBarrierError:
                    print(f"Barrier broken for {client_id}, likely another client disconnected.")
                    break

        except (EOFError, ConnectionResetError, pickle.UnpicklingError):
             print(f"Client {client_address} disconnected.")
        except Exception as e:
            print(f"Error handling client {client_address}: {e}")
        finally:
            print(f"Connection with {client_address} closed.")
            if not self.barrier.broken:
                self.barrier.abort()
            client_socket.close()
            with self.lock:
                if client_socket in self.client_sockets:
                    self.client_sockets.remove(client_socket)

    def save_logs(self):
        with open(self.config['system']['log_file'], 'w') as f:
            json.dump(self.training_logs, f, indent=4)
        print(f"Training logs saved to {self.config['system']['log_file']}")

    def save_model(self):
        save_path = self.config['system']['model_save_path']
        os.makedirs(os.path.dirname(save_path), exist_ok=True) 
        if self.global_agent:
            torch.save(self.global_agent.actor.state_dict(), save_path)
            print(f"Global model saved to {save_path}")
        else:
            print("Warning: No global model was initialized, nothing to save.")

    def start(self):
        server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server_socket.bind((self.host, self.port))
        server_socket.listen(self.num_clients)
        print(f"Server listening on {self.host}:{self.port}")

        threads = []
        try:
            for _ in range(self.num_clients):
                client_socket, client_address = server_socket.accept()
                with self.lock:
                    self.client_sockets.append(client_socket)
                thread = threading.Thread(target=self.handle_client, args=(client_socket, client_address))
                threads.append(thread)
                thread.start()

            for thread in threads:
                thread.join()
        
        except KeyboardInterrupt:
            print("\nServer interrupted by user.")
        finally:
            print("Server shutting down. Saving final model and logs.")
            self.save_model()
            self.save_logs()
            for s in self.client_sockets:
                s.close()
            server_socket.close()
