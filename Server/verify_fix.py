
import os
import sys
import traci
import yaml
from unittest.mock import MagicMock

# Import the class we patched
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.modes.base_mode import BaseMode

# Mock dependencies
class MockSUMO:
    def __init__(self, config):
        self.config = config
        self.simulation_running = True
        self.simulation_paused = False
        self.closed_streets = set()
        self.active_tls = set() 

class MockEventMgr:
    def __init__(self):
        self.events = []
        
class MockSocket:
    def emit(self, *args, **kwargs):
        pass

class Verifier(BaseMode):
    def __init__(self, config_path):
        with open(config_path) as f:
            self.config = yaml.safe_load(f)
            
        sumo_mgr = MockSUMO(self.config)
        
        super().__init__(sumo_mgr, MockEventMgr(), MockSocket())
        
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

    def verify(self):
        print("🚀 Starting SUMO for verification...")
        traci.start(self.sumo_cmd)
        
        # Populate active_tls same as we saw in debug (all of them)
        self.sumo.active_tls = set(traci.trafficlight.getIDList())
        print(f"Total RAW TLS: {len(self.sumo.active_tls)}")
        
        # Run our modified extraction
        vehicles, tl_data = self.get_simulation_state()
        visible_tls = tl_data['traffic_lights']
        
        print(f"✅ Filtered Visible TLS Count: {len(visible_tls)}")
        
        # Known ped only signals from previous analysis
        ped_signals = [
            "10006525749", "10215107460", "11068775506", "5458429287"
        ]
        
        found_ped = False
        for pid in ped_signals:
            # The keys are like {tl_id}_{road_id}
            # Check if any key starts with the pid
            matches = [k for k in visible_tls.keys() if k.startswith(pid)]
            if matches:
                print(f"❌ FAILED: Found pedestrian signal {pid} in output: {matches}")
                found_ped = True
                
        if not found_ped:
            print("✅ SUCCESS: Known pedestrian signals were filtered out.")
            
        traci.close()

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    config_path = os.path.join(current_dir, "config.yaml")
    
    verifier = Verifier(config_path)
    verifier.verify()
