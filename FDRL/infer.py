"""
Inference Script: 4-Mode Comparison
1. DEFAULT: Actuated/Native SUMO logic
2. FIXED:   Strict 60s cycle for ALL junctions
3. RL:      FDRL Agent for ALL junctions <= max_roads
4. ALL:     Runs 1, 2, and 3 sequentially
"""

import yaml
import torch
import numpy as np
import traci
import argparse
import json
import os
import random
import time
from collections import defaultdict
from sumo_simulator import SumoSimulator
from ppo_agent import Actor


def get_vehicle_category(sumo_type):
    vtype_lower = sumo_type.lower()
    if "truck" in vtype_lower or "trailer" in vtype_lower:
        return "ambulance"
    elif "bus" in vtype_lower:
        return "bus"
    elif "motorcycle" in vtype_lower or "bike" in vtype_lower:
        return "motorcycle"
    elif "ambulance" in vtype_lower or "emergency" in vtype_lower:
        return "ambulance"
    else:
        return "car"


def run_single_mode(config, mode, output_file, duration, gui=False):
    print(f"\n{'=' * 70}")

    print(f"STARTING MODE: {mode.upper()}")
    print(f"{'=' * 70}")
    mode = "default" if mode == "vegha" else mode
    sim = SumoSimulator(config["sumo"]["config_file"], config, gui=gui)

    max_roads = config["system"]["max_roads"]
    all_junctions = traci.trafficlight.getIDList()

    # -------------------------------------------------
    # Identify RL Targets (Any junction <= max_roads)
    # -------------------------------------------------
    rl_targets = []
    for jid in all_junctions:
        try:
            lanes = traci.trafficlight.getControlledLanes(jid)
            roads = set([traci.lane.getEdgeID(l) for l in lanes])
            if len(roads) <= max_roads:
                rl_targets.append(jid)
        except:
            pass

    # -------------------------------------------------
    # SETUP MODES
    # -------------------------------------------------
    agents = {}

    if mode == "default":
        print("Using Default (Actuated) logic for ALL.")
        for jid in all_junctions:
            try:
                traci.trafficlight.setProgram(jid, "0")
            except:
                pass

    elif mode == "fixed":
        print(f"Forcing 'fixed_60' for ALL {len(all_junctions)} junctions.")
        for jid in all_junctions:
            try:
                traci.trafficlight.setProgram(jid, "fixed_60")
            except:
                pass

    elif mode == "rl":
        print(f"RL Targets (<= {max_roads} roads): {len(rl_targets)} junctions")
        print(f"Others ({len(all_junctions) - len(rl_targets)}): Default Logic")

        # Load Model
        model_path = config["system"]["model_save_path"]
        if not os.path.exists(model_path):
            print(f"✗ Model missing: {model_path}")
            sim.close()
            return

        state_dim = 2 * max_roads
        action_dim = max_roads
        universal_actor = Actor(state_dim, action_dim, config)
        try:
            universal_actor.load_state_dict(
                torch.load(model_path, map_location="cpu", weights_only=True)
            )
            universal_actor.eval()
        except Exception as e:
            print(f"❌ Model load error: {e}")
            sim.close()
            return

        for jid in rl_targets:
            agents[jid] = universal_actor
            try:
                traci.trafficlight.setProgram(jid, "rl_program")
            except:
                pass

    # -------------------------------------------------
    # SIMULATION
    # -------------------------------------------------
    print(f"Running for {duration} seconds...")
    unique_vehicle_stats = {}
    end_time = traci.simulation.getTime() + duration

    # Speed Optimization: Collect data every 20s (approx RL step time)
    # This speeds up Default/Fixed modes drastically
    rl_step_size = config["fdrl"]["green_time"] + config["fdrl"]["yellow_time"]
    DATA_COLLECTION_INTERVAL = float(rl_step_size)
    print(f"Data Collection Interval: {DATA_COLLECTION_INTERVAL:.1f}s")
    last_data_time = traci.simulation.getTime()
    last_print_time = traci.simulation.getTime()

    while traci.simulation.getTime() < end_time:
        if traci.simulation.getMinExpectedNumber() <= 0:
            print("⚠️ Traffic file ended early.")
            break

        # Control
        if mode == "rl":
            for jid in rl_targets:
                if jid in agents and jid in sim.junctions:
                    state = sim.get_state(jid)
                    state_tensor = torch.FloatTensor(state)
                    with torch.no_grad():
                        action = torch.argmax(agents[jid](state_tensor)).item()
                    sim.set_phase(
                        jid,
                        action,
                        config["fdrl"]["yellow_time"],
                        config["fdrl"]["green_time"],
                    )
        else:
            sim.simulation_step()

        # Data Collection (Throttled for Speed)
        current_time = traci.simulation.getTime()

        # We must collect data periodically.
        # For RL, 'set_phase' jumps time, so this runs naturally every ~18s.
        # For Fixed, this 'if' prevents checking 1000 cars every single second.
        if current_time - last_data_time >= DATA_COLLECTION_INTERVAL:
            for vid in traci.vehicle.getIDList():
                try:
                    vtype = traci.vehicle.getTypeID(vid)
                    wait = traci.vehicle.getAccumulatedWaitingTime(vid)
                    cat = get_vehicle_category(vtype)
                    unique_vehicle_stats[vid] = {"category": cat, "wait_time": wait}
                except:
                    continue
            last_data_time = current_time

        # Progress Printing
        if current_time - last_print_time >= 500:
            print(
                f"Time: {current_time:.1f}s / {end_time:.1f}s | Unique Vehicles: {len(unique_vehicle_stats)}"
            )
            last_print_time = current_time

    sim.close()

    # -------------------------------------------------
    # SAVE RESULTS
    # -------------------------------------------------
    print("Calculating statistics...")
    stats = defaultdict(list)
    for data in unique_vehicle_stats.values():
        stats[data["category"]].append(data["wait_time"])

    traffic_data = []
    tot_wait, tot_count = 0, 0
    unique_vehicle_types = list(stats.keys())
    for cat in unique_vehicle_types:
        times = stats.get(cat, [])
        count = len(times)
        avg = np.mean(times) if count > 0 else 0.0
        traffic_data.append(
            {
                "vehicle_type": cat,
                "no_of_vehicles": count,
                "avg_waiting_time": round(float(avg), 2),
            }
        )
        tot_wait += sum(times)
        tot_count += count

    overall = tot_wait / tot_count if tot_count > 0 else 0.0
    traffic_data.append(
        {
            "vehicle_type": "any",
            "no_of_vehicles": tot_count,
            "avg_waiting_time": round(float(overall), 2),
        }
    )

    output_data = {
        "model_type": mode,
        "duration_seconds": duration,
        "traffic_data": traffic_data,
    }

    with open(output_file, "w") as f:
        json.dump(output_data, f, indent=4)
    print(f"✓ Saved: {output_file}\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--mode", required=True, choices=["default", "fixed", "vegha", "all"]
    )
    parser.add_argument("--gui", action="store_true")
    parser.add_argument("--output", default="inference_results")
    parser.add_argument("--duration", type=int, default=3600)
    args = parser.parse_args()

    with open("config.yaml", "r") as f:
        config = yaml.safe_load(f)

    # --- INTELLIGENT PATH HANDLING ---
    if args.output.endswith(".json"):
        # User provided a specific file path (e.g., "results/my_run.json")
        output_dir = os.path.dirname(args.output)
        # Create the directory part if it doesn't exist (and isn't empty)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        if args.mode == "all":
            print(
                "❌ Error: When mode is 'all', --output must be a DIRECTORY, not a .json file."
            )
            exit(1)

        # Run single mode with exact file path
        run_single_mode(config, args.mode, args.output, args.duration, args.gui)

    else:
        # User provided a directory (e.g., "inference_results")
        os.makedirs(args.output, exist_ok=True)

        if args.mode == "all":
            # Run ALL modes sequentially
            run_single_mode(
                config,
                "default",
                f"{args.output}/default.json",
                args.duration,
                args.gui,
            )
            time.sleep(2)
            run_single_mode(
                config, "fixed", f"{args.output}/fixed.json", args.duration, args.gui
            )
            # time.sleep(2)
            # run_single_mode(
            #     config, "rl", f"{args.output}/rl.json", args.duration, args.gui
            # )
        else:
            # Run single mode, auto-generating filename inside directory
            outfile = f"{args.output}/{args.mode}.json"
            run_single_mode(config, args.mode, outfile, args.duration, args.gui)
