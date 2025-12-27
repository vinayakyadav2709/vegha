# discover_junctions.py (CORRECTED)

import yaml
from ruamel.yaml import YAML
from sumo_simulator import SumoSimulator
import sys

def discover_and_update_config(config_path='config.yaml'):
    """
    Discovers controllable junctions, filters them for a homogeneous topology
    (e.g., only 4-way intersections), and updates the config file.
    """
    print("Starting temporary SUMO simulation to discover and filter junctions...")

    try:
        # Step 1: Read the YAML config to find the path to the SUMO config file
        with open(config_path, 'r') as f:
            py_config = yaml.safe_load(f)
        sumo_config_file_path = py_config['sumo']['config_file']

        # Step 2: Pass the CORRECT (.sumocfg) path to the simulator
        temp_sim = SumoSimulator(sumo_config_file_path, gui=False)
        all_junctions_info = temp_sim.junctions
        temp_sim.close()

    except FileNotFoundError:
        print(f"Error: Could not find the configuration file at '{config_path}'")
        sys.exit(1)
    except Exception as e:
        print(f"\nAn error occurred while trying to connect to SUMO.")
        print(f"Please check that the path in '{config_path}' under sumo -> config_file is correct.")
        print(f"   Original error: {e}")
        sys.exit(1)

    # --- INTELLIGENT FILTERING LOGIC ---
    TARGET_NUM_ROADS = 4 
    
    all_discovered_ids = list(all_junctions_info.keys())
    eligible_junctions = []

    print(f"\nFound {len(all_discovered_ids)} total junctions with traffic lights.")
    print(f"Filtering for homogeneous junctions with exactly {TARGET_NUM_ROADS} incoming roads...")

    for j_id, j_info in all_junctions_info.items():
        if len(j_info['incoming_roads']) == TARGET_NUM_ROADS:
            if len(j_info['action_to_phase']) == TARGET_NUM_ROADS:
                eligible_junctions.append(j_info)

    if not eligible_junctions:
        print(f"\n❌ FATAL: No junctions with exactly {TARGET_NUM_ROADS} incoming roads and complete phase maps were found.")
        print("Please check your network file in NETEDIT or change TARGET_NUM_ROADS in this script.")
        sys.exit(1)

    eligible_ids = [j['id'] for j in eligible_junctions]

    print("\n--- Eligible Junctions for Training ---")
    for j_id in eligible_ids:
        print(f"- {j_id}")
    print("--------------------------------------")

    # Use ruamel.yaml to safely update the config file while preserving comments
    ryaml = YAML()
    with open(config_path, 'r') as f:
        config_data = ryaml.load(f)
    
    config_data['system']['controlled_junctions'] = eligible_ids
    
    with open(config_path, 'w') as f:
        ryaml.dump(config_data, f)
        
    print(f"\n✅ Successfully updated '{config_path}' with {len(eligible_ids)} eligible junction IDs.")

if __name__ == '__main__':
    discover_and_update_config()