"""
FDRL Training Orchestration
Spawns federated server and multiple client processes for distributed training
"""

import yaml
import multiprocessing
import time
import json
import pandas as pd
import matplotlib.pyplot as plt
from federated_server import FederatedServer
from federated_client import FederatedClient
from sumo_simulator import SumoSimulator
import os


def run_server(config, ready_event):
    """Start federated server process."""
    server = FederatedServer(config, ready_event)
    server.start()


def run_client(junction_info, config):
    """Start federated client process."""
    time.sleep(3)  # Initial delay to ensure server is ready
    client = FederatedClient(junction_info, config)
    client.run()


def save_training_plot(log_file, output_path):
    """Generate training performance visualization."""
    print("\nGenerating training plot...")

    try:
        with open(log_file, "r") as f:
            logs = json.load(f)

        if not logs:
            print("  ✗ No training data")
            return

        df = pd.DataFrame(logs)
        epochs = df["epoch"]

        # Setup plot style
        plt.style.use("seaborn-v0_8-whitegrid")
        plt.rcParams["font.family"] = "serif"

        fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(10, 8), sharex=True)

        # Reward plot with moving average
        reward_ma = df["cumulative_reward"].rolling(window=10, min_periods=1).mean()
        ax1.plot(
            epochs, df["cumulative_reward"], color="lightblue", alpha=0.5, label="Raw"
        )
        ax1.plot(epochs, reward_ma, color="darkblue", linewidth=2, label="Moving Avg")
        ax1.set_ylabel("Cumulative Reward", fontsize=12)
        ax1.set_title("Federated RL Training Performance", fontsize=14, weight="bold")
        ax1.legend()
        ax1.grid(True, alpha=0.3)

        # Loss plot
        ax2.plot(
            epochs, df["actor_loss"], color="orange", linewidth=1.5, label="Actor Loss"
        )
        ax2.plot(
            epochs, df["critic_loss"], color="green", linewidth=1.5, label="Critic Loss"
        )
        ax2.set_ylabel("Loss", fontsize=12)
        ax2.set_xlabel("Epoch", fontsize=12)
        ax2.legend()
        ax2.grid(True, alpha=0.3)

        plt.tight_layout()
        plt.savefig(output_path, dpi=300, bbox_inches="tight")
        plt.close()

        print(f"  ✓ Plot saved: {output_path}")

    except Exception as e:
        print(f"  ✗ Plot generation failed: {e}")


if __name__ == "__main__":
    # Load configuration
    with open("config.yaml", "r") as f:
        config = yaml.safe_load(f)

    print("Discovering junctions...")
    temp_sim = SumoSimulator(config["sumo"]["config_file"], config, gui=False)
    controlled_junction_ids = config["system"]["controlled_junctions"]
    controlled_junctions_info = [
        temp_sim.junctions[j_id] for j_id in controlled_junction_ids
    ]
    temp_sim.close()

    print(f"Training with {len(controlled_junctions_info)} junctions\n")

    # Create server and client processes
    server_ready = multiprocessing.Event()
    server_process = multiprocessing.Process(
        target=run_server, args=(config, server_ready)
    )

    client_processes = [
        multiprocessing.Process(target=run_client, args=(j_info, config))
        for j_info in controlled_junctions_info
    ]

    # Start server
    server_process.start()
    print("Waiting for server...")
    server_ready.wait(timeout=30)
    print("Server ready! Starting clients...\n")

    # Start clients with staggered delays
    for p in client_processes:
        p.start()
        time.sleep(0.5)  # Stagger client starts

    # Wait for training to complete
    try:
        server_process.join()
        for p in client_processes:
            p.join()
    except KeyboardInterrupt:
        print("\n\nInterrupted! Cleaning up...")
    finally:
        if server_process.is_alive():
            server_process.terminate()
        for p in client_processes:
            if p.is_alive():
                p.terminate()

    # Generate visualization
    output_dir = "training_results"
    os.makedirs(output_dir, exist_ok=True)
    plot_path = os.path.join(output_dir, "training_performance_plot.png")
    save_training_plot(config["system"]["log_file"], plot_path)

    print("\n✓ Training complete!")
