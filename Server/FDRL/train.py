# train.py (CORRECTED AND SIMPLER)

import yaml
import multiprocessing
import time
import matplotlib.pyplot as plt
import json
import pandas as pd
from federated_server import FederatedServer
from federated_client import FederatedClient
from sumo_simulator import SumoSimulator

def run_server(config):
    server = FederatedServer(config)
    server.start()

def run_client(junction_info, config):
    time.sleep(2)
    client = FederatedClient(junction_info, config)
    client.run()

def live_plot(log_file):
    plt.ion()
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8))
    fig.suptitle("FDRL Training Metrics")
    
    while True:
        try:
            if not plt.get_fignums(): break
            with open(log_file, 'r') as f: logs = json.load(f)
            if not logs:
                plt.pause(2)
                continue

            df = pd.DataFrame(logs)
            epochs = df['epoch']
            
            # --- ADDED SMOOTHING ---
            reward_ma = df['cumulative_reward'].rolling(window=10, min_periods=1).mean()
            
            ax1.clear(); ax1.grid(True)
            ax1.set_ylabel("Cumulative Reward")
            ax1.plot(epochs, df['cumulative_reward'], label='Reward per Epoch', alpha=0.3)
            ax1.plot(epochs, reward_ma, label='10-Epoch Moving Average', color='red', linewidth=2)
            ax1.legend()
            
            ax2.clear(); ax2.grid(True)
            ax2.set_ylabel("Loss")
            ax2.set_xlabel("Epoch")
            ax2.plot(epochs, df['actor_loss'], label='Actor Loss')
            ax2.plot(epochs, df['critic_loss'], label='Critic Loss')
            ax2.legend()
            
            plt.tight_layout(rect=[0, 0, 1, 0.96]); plt.draw(); plt.pause(5)
        except (FileNotFoundError, json.JSONDecodeError, pd.errors.EmptyDataError):
            plt.pause(2)
        except KeyboardInterrupt:
            break
    plt.ioff()

if __name__ == '__main__':
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)

    # The config file is now the source of truth for which junctions to run.
    # We still need to get the full junction info (like road names).
    print("Getting junction details from SUMO network...")
    temp_sim = SumoSimulator(config['sumo']['config_file'], gui=False)
    
    # Create the list of junction info objects based on the pre-filtered IDs in the config
    controlled_junction_ids = config['system']['controlled_junctions']
    controlled_junctions_info = [temp_sim.junctions[j_id] for j_id in controlled_junction_ids]
    temp_sim.close()
    
    print(f"Found details for {len(controlled_junctions_info)} junctions to be controlled.")

    # Create and start processes
    server_process = multiprocessing.Process(target=run_server, args=(config,))
    client_processes = [
        multiprocessing.Process(target=run_client, args=(j_info, config))
        for j_info in controlled_junctions_info
    ]
    
    server_process.start()
    for p in client_processes: p.start()
    plot_process = multiprocessing.Process(target=live_plot, args=(config['system']['log_file'],))
    plot_process.start()

    try:
        server_process.join()
        for p in client_processes: p.join()
    except KeyboardInterrupt:
        print("\nInterrupted by user. Terminating processes...")
    finally:
        if server_process.is_alive(): server_process.terminate()
        for p in client_processes:
            if p.is_alive(): p.terminate()
        if plot_process.is_alive(): plot_process.terminate()
        
    print("Training finished.")