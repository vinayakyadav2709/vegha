"""
Inference Script for FDRL Traffic Control Performance Evaluation
Outputs JSON with vehicle-type statistics
"""

# uses actutarors
import yaml
import torch
import numpy as np
import traci
import argparse
import json
import os
from collections import defaultdict
from sumo_simulator import SumoSimulator
from ppo_agent import Actor


def run_inference(config, mode, output_file, gui=False):
    """
    Main function to run the inference simulation.
    Runs until all vehicles are cleared from the network.
    """
    print(f"\n{'=' * 70}")
    print(f"MODE: {mode.upper()}")
    print(f"{'=' * 70}\n")

    # Type mapping (SUMO types -> our categories)
    type_mapping = {
        "bus_bus": "bus",
        "motorcycle_motorcycle": "motorcycle",
        "truck_truck": "truck",
        "veh_passenger": "car",
        "passenger": "car",
        "DEFAULT_VEHTYPE": "car",
    }

    # Category grouping (your custom format)
    # private = motorcycle + car
    # emergency = truck
    # public = bus
    category_mapping = {
        "motorcycle": "private",
        "car": "private",
        "truck": "emergency",
        "bus": "public",
    }

    # Start simulation
    print("Starting simulation...\n")
    sim = SumoSimulator(config["sumo"]["config_file"], config, gui=gui)
    controlled_junctions = config["system"]["controlled_junctions"]

    # Load RL model if needed
    agents = {}
    if mode == "rl":
        model_path = "saved_models/universal_model.pth"
        if not os.path.exists(model_path):
            print(f"✗ Model not found at '{model_path}'. Run training first.")
            sim.close()
            return

        max_roads = config["system"]["max_roads"]
        state_dim = 2 * max_roads
        action_dim = max_roads

        print(f"Loading FDRL model for {len(controlled_junctions)} junctions...")
        for jid in controlled_junctions:
            agents[jid] = Actor(state_dim, action_dim, config)
            agents[jid].load_state_dict(torch.load(model_path, map_location="cpu"))
            agents[jid].eval()

            try:
                traci.trafficlight.setProgram(jid, "rl_program")
            except traci.TraCIException:
                print(f"  ⚠️  Could not set RL program for {jid[:30]}")
        print()

    print(f"Running simulation until all vehicles are cleared...\n")

    # Data collection structures
    all_vehicle_data = defaultdict(lambda: {"wait_times": [], "count": 0})

    # Main simulation loop - runs until all vehicles cleared
    step = 0
    max_steps = 100000  # Safety limit
    log_interval = 100

    while traci.simulation.getMinExpectedNumber() > 0:
        if step >= max_steps:
            print(f"\n⚠️  Reached maximum step limit ({max_steps})")
            print(f"   Vehicles remaining: {traci.simulation.getMinExpectedNumber()}")
            break

        # RL control logic
        if mode == "rl":
            for jid in controlled_junctions:
                if jid in agents and jid in sim.junctions:
                    state = sim.get_state(jid)
                    state_tensor = torch.FloatTensor(state)
                    with torch.no_grad():
                        action_probs = agents[jid](state_tensor)
                        action = torch.argmax(action_probs).item()
                    actual_roads = len(sim.junctions[jid]["incoming_roads"])
                    if action < actual_roads:
                        sim.set_phase(
                            jid,
                            action,
                            config["fdrl"]["yellow_time"],
                            config["fdrl"]["green_time"],
                        )
        else:
            # FIXED mode: manually advance simulation
            try:
                traci.simulationStep()
            except traci.TraCIException as e:
                print(f"\n⚠️  Simulation error at step {step}: {e}")
                break

        # Collect vehicle data periodically
        if step % log_interval == 0:
            current_time = traci.simulation.getTime()
            vehicles_expected = traci.simulation.getMinExpectedNumber()
            all_vehicles = traci.vehicle.getIDList()

            print(
                f"Step {step:6d} | Time: {current_time:8.1f}s | "
                f"Active: {len(all_vehicles):4d} | Remaining: {vehicles_expected:4d}"
            )

            # Collect waiting time data
            for vid in all_vehicles:
                try:
                    vtype_sumo = traci.vehicle.getTypeID(vid)
                    vtype_base = type_mapping.get(vtype_sumo, vtype_sumo)

                    # Map to your categories
                    vtype_category = category_mapping.get(vtype_base, vtype_base)

                    accumulated_wait = traci.vehicle.getAccumulatedWaitingTime(vid)
                    all_vehicle_data[vtype_category]["wait_times"].append(
                        accumulated_wait
                    )
                    all_vehicle_data[vtype_category]["count"] += 1

                except traci.TraCIException:
                    continue

        step += 1

    # Calculate final statistics
    traffic_data = []
    total_vehicles = 0
    total_wait_time_sum = 0

    # Process each category
    for category in ["private", "public", "emergency"]:
        if category in all_vehicle_data and all_vehicle_data[category]["wait_times"]:
            wait_times = all_vehicle_data[category]["wait_times"]
            num_vehicles = len(wait_times)
            avg_wait = np.mean(wait_times)

            traffic_data.append(
                {
                    "vehicle_type": category,
                    "no_of_vehicles": num_vehicles,
                    "avg_waiting_time": round(float(avg_wait), 2),
                }
            )

            total_vehicles += num_vehicles
            total_wait_time_sum += sum(wait_times)
        else:
            # No vehicles of this type
            traffic_data.append(
                {"vehicle_type": category, "no_of_vehicles": 0, "avg_waiting_time": 0.0}
            )

    # Add 'any' category (overall)
    if total_vehicles > 0:
        overall_avg_wait = total_wait_time_sum / total_vehicles
    else:
        overall_avg_wait = 0.0

    traffic_data.append(
        {
            "vehicle_type": "any",
            "no_of_vehicles": total_vehicles,
            "avg_waiting_time": round(float(overall_avg_wait), 2),
        }
    )

    # Create output JSON
    output_data = {"model_type": mode, "traffic_data": traffic_data}

    # Save to file
    with open(output_file, "w") as f:
        json.dump(output_data, f, indent=2)

    # Print completion message
    print(f"\n{'=' * 70}")
    print(f"✓ Simulation completed successfully!")
    print(f"{'=' * 70}")
    print(f"  Mode: {mode.upper()}")
    print(f"  Total steps executed: {step}")
    print(f"  Simulation time: {traci.simulation.getTime():.1f} seconds")
    print(f"  All vehicles cleared from network")
    print(f"{'=' * 70}\n")

    sim.close()

    # Print results
    print("--- Final Statistics ---")
    print(json.dumps(output_data, indent=2))
    print(f"\n✓ Results saved to: {output_file}")
    print("------------------------\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Run SUMO inference for traffic control."
    )
    parser.add_argument(
        "--mode",
        type=str,
        required=True,
        choices=["fixed", "rl"],
        help="Traffic control mode: fixed (baseline) or rl (FDRL model).",
    )
    parser.add_argument(
        "--gui",
        action="store_true",
        help="Show SUMO GUI during simulation (default: headless).",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output JSON file path (default: inference_results/<mode>_results.json).",
    )
    args = parser.parse_args()

    with open("config.yaml", "r") as f:
        config = yaml.safe_load(f)

    # Set default output path
    os.makedirs("inference_results", exist_ok=True)
    if args.output is None:
        output_file = f"inference_results/{args.mode}_results.json"
    else:
        output_file = args.output

    run_inference(config, args.mode, output_file, gui=args.gui)
