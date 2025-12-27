"""
Traffic Light Logic Generator (FINAL)
1. 'fixed_60' for EVERY junction (Baseline).
2. 'rl_program' for ANY junction with roads <= max_roads (RL Targets).
"""

import os
import sys
import yaml
import traci
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom.minidom import parseString
from sumo_simulator import SumoSimulator


def generate_tls_programs(config_path="config.yaml"):
    print("=" * 70)
    print("GENERATING TRAFFIC LIGHT PROGRAMS")
    print("=" * 70)

    with open(config_path, "r") as f:
        config = yaml.safe_load(f)

    max_roads = config["system"]["max_roads"]  # e.g., 4
    print(f"Max Roads for RL: {max_roads}")
    print("Initializing SUMO to scan network...")

    # Init simulator to read map
    temp_sim = SumoSimulator(config["sumo"]["config_file"], config, gui=False)

    all_junction_ids = traci.trafficlight.getIDList()
    print(f"Total Junctions Found: {len(all_junction_ids)}")

    xml_root = Element("additional")
    count_fixed = 0
    count_rl = 0

    for tls_id in all_junction_ids:
        try:
            controlled_links = traci.trafficlight.getControlledLinks(tls_id)
        except:
            print(f"  ⚠ Skipping {tls_id}: Error reading links.")
            continue

        # Determine incoming roads
        incoming_lanes = traci.trafficlight.getControlledLanes(tls_id)
        incoming_roads = sorted(
            list(set([traci.lane.getEdgeID(l) for l in incoming_lanes]))
        )
        num_roads = len(incoming_roads)
        num_signals = len(controlled_links)

        # -------------------------------------------------------------
        # A. GENERATE 'fixed_60' FOR EVERYONE (Baseline)
        # -------------------------------------------------------------
        tl_logic_fixed = SubElement(
            xml_root,
            "tlLogic",
            {"id": tls_id, "type": "static", "programID": "fixed_60", "offset": "0"},
        )

        for road in incoming_roads:
            state = ["r"] * num_signals
            for link_idx, links in enumerate(controlled_links):
                if links and traci.lane.getEdgeID(links[0][0]) == road:
                    state[link_idx] = "G"

            state_green = "".join(state)
            state_yellow = state_green.replace("G", "y").replace("g", "y")

            SubElement(
                tl_logic_fixed, "phase", {"duration": "60", "state": state_green}
            )
            SubElement(
                tl_logic_fixed, "phase", {"duration": "3", "state": state_yellow}
            )
        if len(tl_logic_fixed.findall("phase")) == 0:
            xml_root.remove(tl_logic_fixed)
            print(f"  ⚠ Removed empty fixed_60 for {tls_id}")
            continue

        count_fixed += 1

        # -------------------------------------------------------------
        # B. GENERATE 'rl_program' IF ELIGIBLE (<= max_roads)
        # -------------------------------------------------------------
        if num_roads <= max_roads:
            tl_logic_rl = SubElement(
                xml_root,
                "tlLogic",
                {
                    "id": tls_id,
                    "type": "static",
                    "programID": "rl_program",
                    "offset": "0",
                },
            )

            for road in incoming_roads:
                state = ["r"] * num_signals
                for link_idx, links in enumerate(controlled_links):
                    if links and traci.lane.getEdgeID(links[0][0]) == road:
                        state[link_idx] = "G"

                state_green = "".join(state)
                state_yellow = state_green.replace("G", "y").replace("g", "y")

                # Times from config (Agent overrides them anyway)
                SubElement(
                    tl_logic_rl,
                    "phase",
                    {
                        "duration": str(config["fdrl"]["green_time"]),
                        "state": state_green,
                    },
                )
                SubElement(
                    tl_logic_rl,
                    "phase",
                    {
                        "duration": str(config["fdrl"]["yellow_time"]),
                        "state": state_yellow,
                    },
                )

            count_rl += 1
        else:
            print(f"  ℹ {tls_id}: {num_roads} roads -> Too big for RL (Fixed only)")
        if len(tl_logic_rl.findall("phase")) == 0:
            xml_root.remove(tl_logic_rl)
            print(f"  ⚠ Removed empty rl_program for {tls_id}")

    temp_sim.close()

    # Save XML
    xml_string = tostring(xml_root, "utf-8")
    pretty_xml = parseString(xml_string).toprettyxml(indent="  ")
    pretty_xml = "\n".join([line for line in pretty_xml.split("\n") if line.strip()])

    sumo_dir = os.path.dirname(config["sumo"]["config_file"])
    output_path = os.path.join(sumo_dir, "rl_traffic_lights.add.xml")

    with open(output_path, "w") as f:
        f.write(pretty_xml)

    print(f"\nSUCCESS:")
    print(f"  - 'fixed_60' generated for {count_fixed} junctions (ALL)")
    print(f"  - 'rl_program' generated for {count_rl} junctions (<= {max_roads} roads)")
    print(f"  - File: {output_path}")
    print(f"add this line: to your SUMO config <additional-files> section:")
    print(f'    <additional-files value="rl_traffic_lights.add.xml"/>')
    print(f"or if tag exists, append the file to the value list like so:")
    print(
        f'    <additional-files value="existing_file.add.xml,rl_traffic_lights.add.xml"/>'
    )
    print("=" * 70)


if __name__ == "__main__":
    generate_tls_programs()
