
import os
import sys
import traci
import yaml
import math

class Finder:
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

    def find(self):
        print("🚀 Starting SUMO to find signal...")
        traci.start(self.sumo_cmd)
        
        target_angle = 76.5101
        tolerance = 0.1
        
        all_tls = traci.trafficlight.getIDList()
        found = False
        
        for tl_id in all_tls:
            if tl_id.startswith(":"): continue
            
            lanes = traci.trafficlight.getControlledLanes(tl_id)
            for i, lane_id in enumerate(lanes):
                shape = traci.lane.getShape(lane_id)
                if not shape or len(shape) < 2: continue
                
                x1, y1 = shape[-2]
                x2, y2 = shape[-1]
                # Note: base_mode.py uses math.degrees(math.atan2(y2 - y1, x2 - x1))
                angle = math.degrees(math.atan2(y2 - y1, x2 - x1))
                
                if abs(angle - target_angle) < tolerance:
                    print(f"\n🎯 FOUND MATCH!")
                    print(f"Signal ID: {tl_id}")
                    print(f"Lane ID: {lane_id}")
                    print(f"Calculated Angle: {angle}")
                    
                    # Inspect properties
                    allowed = traci.lane.getAllowed(lane_id)
                    print(f"Allowed Classes: {allowed}")
                    
                    logics = traci.trafficlight.getCompleteRedYellowGreenDefinition(tl_id)
                    if logics:
                        current = logics[0]
                        print(f"Phases ({len(current.phases)}):")
                        states = [p.state for p in current.phases]
                        for idx, s in enumerate(states):
                            lane_char = s[i] if i < len(s) else "?"
                            print(f"  Phase {idx}: {s} (Lane char: {lane_char})")
                            
                    found = True
                    
        if not found:
            print("❌ No matching signal found.")
            
        traci.close()

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(current_dir, "config.yaml")
    
    f = Finder(config_path)
    f.find()
