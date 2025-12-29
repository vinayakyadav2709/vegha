
import os
import sys
import traci
import yaml

class Debugger:
    def __init__(self, config_path):
        with open(config_path) as f:
            self.config = yaml.safe_load(f)
        
        self.sumo_cmd = self._get_sumo_cmd()
        
    def _get_sumo_cmd(self):
        sumo_config = self.config.get("simulation", {}).get("sumo_config")
        if not os.path.exists(sumo_config):
             sumo_config = os.path.join(os.getcwd(), sumo_config)
        
        return [
            "sumo",
            "-c", sumo_config,
            "--no-warnings", "true"
        ]

    def debug(self):
        print("🚀 Starting SUMO for debugging...")
        traci.start(self.sumo_cmd)
        
        # Problematic TLS IDs from previous failure
        targets = ["10006525749", "10215107460", "11068775506"]
        
        relevant_classes = {
            "passenger", "bus", "truck", "trailer", 
            "motorcycle", "moped", "delivery", "taxi",
                   
        }
        
        for tl in targets:
            print(f"\nEvaluating TLS: {tl}")
            lanes = traci.trafficlight.getControlledLanes(tl)
            for lane in lanes:
                allowed = traci.lane.getAllowed(lane)
                print(f"  Lane {lane}: Allowed = {allowed}")
                
                # Replicate logic
                if allowed:
                    is_ped = not any(c in allowed for c in relevant_classes)
                    print(f"    -> Filtered out? {is_ped}")
                else:
                    print("    -> Allowed is empty (All vehicles allowed). Kept.")

        traci.close()

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(current_dir, "config.yaml")
    
    dbg = Debugger(config_path)
    dbg.debug()
