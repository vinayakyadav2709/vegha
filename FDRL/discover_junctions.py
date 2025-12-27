"""
Discover Traffic Light Controlled Junctions
Automatically identifies junctions with traffic lights and updates config.yaml
"""

import yaml
import traci
import sys
import os


def discover_junctions(config_file="config.yaml"):
    """
    Discovers all traffic-light-controlled junctions in the SUMO network
    and updates the config file with the list of controlled junctions.
    """
    # Load configuration
    with open(config_file, "r") as f:
        config = yaml.safe_load(f)

    sumo_config = config["sumo"]["config_file"]

    print("=" * 70)
    print("JUNCTION DISCOVERY TOOL")
    print("=" * 70)
    print(f"\nSUMO Config: {sumo_config}\n")

    # Check if SUMO_HOME is set
    if "SUMO_HOME" not in os.environ:
        print("❌ Error: SUMO_HOME environment variable not set.")
        print("Set it with: export SUMO_HOME=/usr/share/sumo")
        sys.exit(1)

    # Start SUMO in headless mode
    sumo_binary = os.path.join(os.environ["SUMO_HOME"], "bin", "sumo")
    sumo_cmd = [sumo_binary, "-c", sumo_config, "--no-warnings"]

    try:
        traci.start(sumo_cmd)
        print("✓ SUMO started successfully\n")

        # Get all junction IDs
        all_junctions = traci.trafficlight.getIDList()

        print(f"Found {len(all_junctions)} traffic-light-controlled junctions:\n")
        print("-" * 70)

        controlled_junctions = []
        max_roads = 0

        for jid in all_junctions:
            try:
                # Get controlled lanes for this junction
                controlled_lanes = traci.trafficlight.getControlledLanes(jid)

                # Extract unique road IDs (incoming roads)
                incoming_roads = set()
                for lane_id in controlled_lanes:
                    # Lane format: "edge_id_lane_index"
                    road_id = "_".join(lane_id.split("_")[:-1])
                    incoming_roads.add(road_id)

                num_roads = len(incoming_roads)
                max_roads = max(max_roads, num_roads)

                controlled_junctions.append(jid)
                print(f"  • {jid[:50]:<50} | {num_roads} roads")

            except traci.TraCIException as e:
                print(f"  ⚠ Skipping {jid}: {e}")
                continue

        print("-" * 70)
        print(f"\nTotal Controllable Junctions: {len(controlled_junctions)}")
        print(f"Maximum Roads at Any Junction: {max_roads}")

        # Update config file
        config["system"]["controlled_junctions"] = controlled_junctions
        config["system"]["max_roads"] = max_roads

        with open(config_file, "w") as f:
            yaml.dump(config, f, default_flow_style=False, sort_keys=False)

        print(f"\n✓ Config file updated: {config_file}")
        print("=" * 70)

    except Exception as e:
        print(f"\n❌ Error during discovery: {e}")
        sys.exit(1)

    finally:
        traci.close()


if __name__ == "__main__":
    discover_junctions()
