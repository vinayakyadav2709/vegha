import os
import sys
import argparse
import traci
import utils
import junction
import fdrl_server
import models


SUMO_PORT = 9999
PROJECT_DIR = os.path.expanduser("~/sumo-projs/complex/sumo-files")
CONFIG_FILE = "complex.sumocfg"

AGGREGATION_INTERVAL = 500
LOCAL_WEIGHT_RETENTION = 0.3  # Keep 30% local, 70% global
SAVE_PATH = "global_model.pth"


def parse_args():
    parser = argparse.ArgumentParser(description="FDRL Traffic Management System")
    parser.add_argument(
        "--mode",
        type=str,
        choices=["train", "test"],
        default="train",
        help="'train' from scratch/pretrained or 'test' with frozen weights",
    )
    parser.add_argument(
        "--load", type=str, default=None, help="Path to pretrained model (optional)"
    )
    parser.add_argument(
        "--episodes", type=int, default=1, help="Number of simulation episodes"
    )
    return parser.parse_args()


def run_simulation(args, server, agents, episode_num):
    """Main simulation loop with FL aggregation."""
    step = 0
    aggregation_count = 0
    train_mode = args.mode == "train"

    print(f"\n>> Episode {episode_num + 1}/{args.episodes} (Mode: {args.mode})...")

    while traci.simulation.getMinExpectedNumber() > 0:
        traci.simulationStep()
        current_time = traci.simulation.getTime()

        # Skip first few steps to let simulation stabilize
        if step < 10:
            step += 1
            continue

        # Local Agent Updates
        for agent in agents.values():
            agent.step(current_time, train=train_mode)

        # Federated Aggregation (Only in training mode)
        if train_mode and step > 0 and step % AGGREGATION_INTERVAL == 0:
            print(f"\n[Step {step}] >> Aggregation Round {aggregation_count + 1}...")

            client_weights = [agent.get_weights() for agent in agents.values()]
            new_global_weights = server.aggregate(client_weights)

            for agent in agents.values():
                agent.update_weights(new_global_weights, alpha=LOCAL_WEIGHT_RETENTION)

            server.save_model(SAVE_PATH)
            aggregation_count += 1

        # Logging
        if step % 100 == 0:
            total_wait = sum(
                [
                    utils.get_aggregated_features(agent.all_lanes)[1]
                    for agent in agents.values()
                ]
            )
            epsilon = (
                agents[list(agents.keys())[0]].brain.epsilon if train_mode else 0.0
            )
            print(
                f"   Step {step} | Total Wait: {total_wait:.1f}s | Epsilon: {epsilon:.3f}"
            )

        step += 1

    print(f">> Episode {episode_num + 1} Finished.")


def main():
    args = parse_args()

    # Validate config
    if not os.path.exists(os.path.join(PROJECT_DIR, CONFIG_FILE)):
        print(f"Error: {CONFIG_FILE} not found. Run setup script first.")
        sys.exit(1)

    # Start SUMO
    proc = utils.start_sumo_docker(PROJECT_DIR, CONFIG_FILE, port=SUMO_PORT)

    try:
        traci.init(port=SUMO_PORT, host="localhost")

        # Initialize Server
        baseline_model = models.TrafficSignalScorer()
        server = fdrl_server.FDRLServer(baseline_model)

        # Load pretrained model if specified
        if args.load and os.path.exists(args.load):
            print(f">> Loading model from {args.load}...")
            server.load_model(args.load)
        elif args.mode == "test":
            print("Error: Test mode requires --load <model_path>")
            sys.exit(1)

        # Initialize Agents
        tls_ids = traci.trafficlight.getIDList()
        print(f">> Discovered {len(tls_ids)} Junctions: {tls_ids}")

        global_weights = server.get_global_weights()
        agents = {}

        for tid in tls_ids:
            agent = junction.JunctionAgent(tid)
            if args.load:
                agent.brain.set_weights(global_weights)
            if args.mode == "test":
                agent.brain.epsilon = 0.0  # Disable exploration
            agents[tid] = agent

        # Run Episodes
        for ep in range(args.episodes):
            run_simulation(args, server, agents, ep)

            # Reset for next episode
            if ep < args.episodes - 1:
                for agent in agents.values():
                    agent.reset()
                traci.load(["-c", f"/sumo-projs/{CONFIG_FILE}"])

    except traci.exceptions.FatalTraCIError as e:
        print(f"TraCI Error: {e}")
    except KeyboardInterrupt:
        print("\n>> Interrupted by user")
    finally:
        traci.close()
        proc.kill()
        print(">> Shutdown complete")


if __name__ == "__main__":
    main()
