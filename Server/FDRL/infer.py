# infer.py (CORRECTED with Plot Pagination and Bug Fix)

import yaml
import torch
import numpy as np
import traci
import argparse
import time
import pandas as pd
import matplotlib.pyplot as plt
import os
import multiprocessing
import csv
import math

from sumo_simulator import SumoSimulator
from ppo_agent import Actor

def save_final_plots(log_file, junction_ids, mode, output_dir):
    """
    Reads the final CSV log and generates paginated, high-quality, smoothed plots,
    saving them to multiple files if necessary.
    """
    try:
        df = pd.read_csv(log_file)
        if df.empty:
            print("Log file is empty. Cannot generate final plots.")
            return

        print(f"Generating final performance plots for mode '{mode}'...")

        # --- NEW: PAGINATION LOGIC ---
        JUNCTIONS_PER_PLOT = 3 # Max number of junctions to show on a single image file
        num_junctions = len(junction_ids)
        num_pages = math.ceil(num_junctions / JUNCTIONS_PER_PLOT)

        for page in range(num_pages):
            start_index = page * JUNCTIONS_PER_PLOT
            end_index = start_index + JUNCTIONS_PER_PLOT
            junctions_on_page = junction_ids[start_index:end_index]
            
            num_rows = len(junctions_on_page)
            
            plt.style.use('seaborn-v0_8-whitegrid')
            fig, axes = plt.subplots(num_rows, 2, figsize=(20, 6 * num_rows), squeeze=False)
            fig.suptitle(f"Final Performance (Mode: {mode.upper()}) - Page {page + 1}/{num_pages}", fontsize=20, y=0.99)

            for i, j_id in enumerate(junctions_on_page):
                # --- BUG FIX: Correctly access the two axes for the current row ---
                ax1 = axes[i, 0]
                ax2 = axes[i, 1]
                
                queue_ma = df[f'{j_id}_queue'].rolling(window=150, min_periods=1).mean()
                wait_ma = df[f'{j_id}_wait_time'].rolling(window=150, min_periods=1).mean()

                ax1.set_title(f"Junction '{j_id}' - Queue Length", fontsize=14)
                ax1.plot(df['step'], df[f'{j_id}_queue'], color='lightblue', alpha=0.5, label='Raw Data')
                ax1.plot(df['step'], queue_ma, color='darkred', linewidth=2.5, label='Smoothed (150s MA)')
                ax1.set_ylabel("Queued Vehicles"); ax1.legend()
                
                ax2.set_title(f"Junction '{j_id}' - Waiting Time", fontsize=14)
                ax2.plot(df['step'], df[f'{j_id}_wait_time'], color='lightcoral', alpha=0.5, label='Raw Data')
                ax2.plot(df['step'], wait_ma, color='darkblue', linewidth=2.5, label='Smoothed (150s MA)')
                ax2.set_ylabel("Total Waiting Time (s)"); ax2.legend()

            axes[-1, 0].set_xlabel("Simulation Step (s)", fontsize=12)
            axes[-1, 1].set_xlabel("Simulation Step (s)", fontsize=12)

            plt.tight_layout(rect=[0, 0.03, 1, 0.96])
            plot_filename = os.path.join(output_dir, f"final_plot_{mode}_page_{page + 1}.png")
            plt.savefig(plot_filename, dpi=300)
            plt.close()
            print(f"✅ Final plot page {page + 1}/{num_pages} saved to {plot_filename}")

    except Exception as e:
        print(f"Could not generate final plots. Error: {e}")


def live_plot_inference(log_file, junction_ids, mode):
    """
    Displays a live-updating plot for a limited number of junctions to keep it readable.
    """
    # --- NEW: Limit live plots to a reasonable number ---
    MAX_LIVE_PLOTS = 4
    junctions_to_plot = junction_ids[:MAX_LIVE_PLOTS]
    if len(junction_ids) > MAX_LIVE_PLOTS:
        print(f"Note: Live plot is showing the first {MAX_LIVE_PLOTS} of {len(junction_ids)} junctions. Full results will be in the final saved plots.")

    num_rows = len(junctions_to_plot)
    plt.ion()
    fig, axes = plt.subplots(num_rows, 2, figsize=(18, 5 * num_rows), squeeze=False)
    fig.suptitle(f"Live Inference Performance (Mode: {mode.upper()})", fontsize=16)

    while True:
        try:
            if not plt.get_fignums(): break
            df = pd.read_csv(log_file)
            if df.empty:
                plt.pause(2); continue

            for i, j_id in enumerate(junctions_to_plot):
                # --- BUG FIX: Correctly access the two axes ---
                ax1 = axes[i, 0]
                ax2 = axes[i, 1]

                queue_ma = df[f'{j_id}_queue'].rolling(window=120, min_periods=1).mean()
                wait_ma = df[f'{j_id}_wait_time'].rolling(window=120, min_periods=1).mean()

                ax1.clear(); ax1.grid(True)
                ax1.set_title(f"Junction '{j_id}' - Queue")
                ax1.plot(df['step'], df[f'{j_id}_queue'], alpha=0.3)
                ax1.plot(df['step'], queue_ma, color='tab:red', linewidth=2)
                ax1.set_ylabel("Vehicles")

                ax2.clear(); ax2.grid(True)
                ax2.set_title(f"Junction '{j_id}' - Wait Time")
                ax2.plot(df['step'], df[f'{j_id}_wait_time'], alpha=0.3)
                ax2.plot(df['step'], wait_ma, color='tab:blue', linewidth=2)
                ax2.set_ylabel("Time (s)")

            plt.tight_layout(rect=[0, 0.03, 1, 0.95]); plt.draw(); plt.pause(5)
        except (FileNotFoundError, pd.errors.EmptyDataError):
            plt.pause(2)
        except KeyboardInterrupt:
            break
    plt.ioff()

def run_inference(config, mode, log_file):
    config['sumo']['gui'] = True
    sim = SumoSimulator(config['sumo']['config_file'], step_length=config['sumo']['step_length'], gui=True)
    
    controlled_junction_ids = config['system']['controlled_junctions']
    print(f"Starting inference in '{mode}' mode for junctions: {controlled_junction_ids}")

    agents = {}
    if mode == 'rl':
        # (Code for loading RL agents remains the same)
        for j_id in controlled_junction_ids:
            j_info = sim.junctions[j_id]
            actor = Actor(2 * len(j_info['incoming_roads']), len(j_info['incoming_roads']), config['model']['hidden_layers'])
            try:
                actor.load_state_dict(torch.load(config['system']['model_save_path'])); actor.eval()
                agents[j_id] = actor
            except FileNotFoundError:
                print(f"FATAL: Model not found at {config['system']['model_save_path']}."); sim.close(); return
        sim.init_phase_timers(controlled_junction_ids)

    # (Main simulation loop code remains the same)
    with open(log_file, 'w', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['step'] + [f'{j_id}_{m}' for j_id in controlled_junction_ids for m in ['queue', 'wait_time']])
        
        gridlock_timer, last_running_vehicles = 0, -1
        GRIDLOCK_THRESHOLD = int(config['sumo']['gridlock_detection_time'] / config['sumo']['step_length'])

        step = 0
        while traci.simulation.getMinExpectedNumber() > 0:
            traci.simulationStep()
            
            if mode == 'rl':
                sim.update_phase_timers()
                for j_id in controlled_junction_ids:
                    if sim.phase_timers[j_id] >= config['fdrl']['green_time']:
                        state = sim.get_state(j_id)
                        with torch.no_grad(): action = torch.argmax(agents[j_id](torch.FloatTensor(state))).item()
                        sim.set_phase_inference(j_id, action, config['fdrl']['yellow_time'])

            log_row = [step]
            for j_id in controlled_junction_ids:
                state = sim.get_state(j_id)
                log_row.extend([int(np.sum(state[::2])), np.sum(state[1::2])])
            
            writer.writerow(log_row); f.flush()

            running_vehicles = traci.simulation.getMinExpectedNumber()
            if running_vehicles == last_running_vehicles: gridlock_timer += 1
            else: gridlock_timer = 0
            last_running_vehicles = running_vehicles

            if gridlock_timer > GRIDLOCK_THRESHOLD:
                print(f"\nGRIDLOCK DETECTED. Terminating."); break
            
            step += 1

    sim.close()
    print("Inference simulation finished.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Run FDRL inference for traffic control.")
    parser.add_argument('--mode', type=str, required=True, choices=['rl', 'fixed'], help="Mode: 'rl' or 'fixed'.")
    args = parser.parse_args()

    with open('config.yaml', 'r') as f: config = yaml.safe_load(f)

    output_dir = "inference_results"
    os.makedirs(output_dir, exist_ok=True)
    log_file_path = os.path.join(output_dir, f"inference_log_{args.mode}.csv")
    if os.path.exists(log_file_path): os.remove(log_file_path)

    # Main execution logic
    sim_process = multiprocessing.Process(target=run_inference, args=(config, args.mode, log_file_path))
    # Pass the full list to save_final_plots, but the limited list to live_plot
    plot_process = multiprocessing.Process(target=live_plot_inference, args=(log_file_path, config['system']['controlled_junctions'], args.mode))
    
    sim_process.start()
    plot_process.start()

    try:
        sim_process.join()
    except KeyboardInterrupt:
        print("\nInterrupted by user.")
    finally:
        if sim_process.is_alive(): sim_process.terminate()
        if plot_process.is_alive(): plot_process.terminate()
        # Call the final plot saving function at the end
        save_final_plots(log_file_path, config['system']['controlled_junctions'], args.mode, output_dir)
        print("Inference run complete.")