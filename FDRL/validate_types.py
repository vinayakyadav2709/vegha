import yaml
import traci
from collections import defaultdict
import os


def print_tls_programs(config_path="config.yaml"):
    print("=" * 70)
    print("PRINTING TRAFFIC LIGHT PROGRAM LOGICS")
    print("=" * 70)

    # --------------------------------------------------
    # Load config.yaml
    # --------------------------------------------------
    with open(config_path, "r") as f:
        config = yaml.safe_load(f)

    sumo_cfg = config["sumo"]["config_file"]

    if not os.path.exists(sumo_cfg):
        raise FileNotFoundError(f"SUMO config not found: {sumo_cfg}")

    print(f"Using SUMO config: {sumo_cfg}")

    # --------------------------------------------------
    # Start SUMO directly (NO SumoSimulator)
    # --------------------------------------------------
    traci.start(["sumo", "-c", sumo_cfg, "--no-step-log", "--quit-on-end"])

    # --------------------------------------------------
    # Collect TLS program info
    # --------------------------------------------------
    program_counts = defaultdict(int)

    tls_ids = traci.trafficlight.getIDList()
    print(f"\nTotal traffic lights: {len(tls_ids)}\n")

    for tls_id in tls_ids:
        for logic in traci.trafficlight.getAllProgramLogics(tls_id):
            program_counts[(logic.programID, logic.type)] += 1

    # --------------------------------------------------
    # Print summary
    # --------------------------------------------------
    print("ProgramID     | Type       | Count")
    print("-" * 40)

    for (pid, ptype), count in sorted(program_counts.items()):
        print(f"{pid:<13} | {ptype:<10} | {count}")

    # --------------------------------------------------
    # Clean shutdown
    # --------------------------------------------------
    traci.close()
    print("\nDONE")


print_tls_programs()
