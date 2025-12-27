import sys
import os
import torch
import numpy as np
import traci
from .base_mode import BaseMode

sys.path.insert(0, './FDRL')
from ppo_agent import Actor


class SUMORLEventsMode(BaseMode):
    """RL Mode + Scheduled Events - Complete"""
    
    def __init__(self, sumo_manager, event_manager, socketio, config):
        super().__init__(sumo_manager, event_manager, socketio)
        self.rl_config = config.get('sumo_rl_events', {})
        self.model_config = config.get('model', {})
        self.system_config = config.get('system', {})
        
        self.agent = None
        self.controlled_junctions = []
        self.model_loaded = False
    
    def apply_traffic_light_control(self):
        """Load model on FIRST call + Update events"""
        
        # Load model only once
        if not self.model_loaded:
            try:
                self._load_model()
                self.model_loaded = True
            except Exception as e:
                print(f"❌ FATAL: {e}")
                self.sumo.simulation_running = False
                return
        
        # Update event statuses EVERY step
        self.events.update_event_statuses(self.step)
        
        if not self.agent:
            return
        
        # ONE model controls ALL junctions
        for j_id in self.controlled_junctions:
            try:
                state = self.get_junction_state(j_id)
                
                with torch.no_grad():
                    action = torch.argmax(self.agent(torch.FloatTensor(state).unsqueeze(0)), dim=1).item()
                
                traci.trafficlight.setPhase(j_id, action)
            except:
                pass
    
    def _load_model(self):
        """Load global model from config dims"""
        
        # Get junctions from config
        self.controlled_junctions = self.system_config.get('controlled_junctions', [])
        if not self.controlled_junctions:
            raise RuntimeError("No controlled_junctions in config")
        
        # Use config dims
        state_dim = self.rl_config.get('state_dim', 8)
        action_dim = self.rl_config.get('action_dim', 4)
        
        print(f"🚦 {len(self.controlled_junctions)} junction(s), state_dim={state_dim}, action_dim={action_dim}")
        
        model_path = self.rl_config.get('model_path', './FDRL/saved_models')
        model_file = os.path.join(model_path, 'global_model.pth')
        
        if not os.path.exists(model_file):
            raise FileNotFoundError(f"Model not found: {model_file}")
        
        self.agent = Actor(
            state_dim=state_dim,
            action_dim=action_dim,
            hidden_layers=self.model_config.get('hidden_layers', [64, 16])
        )
        self.agent.load_state_dict(torch.load(model_file, map_location='cpu', weights_only=False))
        self.agent.eval()
        print("✅ AI model loaded - Events + Traffic Control ACTIVE")
    
    def get_junction_state(self, junction_id):
        """Extract state and pad/truncate to config state_dim"""
        state = []
        try:
            for lane_id in traci.lane.getIDList():
                if junction_id in lane_id:
                    queue = traci.lane.getWaitingTime(lane_id)
                    density = traci.lane.getLastStepVehicleNumber(lane_id)
                    state.extend([queue, density])
        except:
            pass
        
        state_dim = self.rl_config.get('state_dim', 8)
        
        # Pad or truncate to state_dim
        while len(state) < state_dim:
            state.append(0)
        state = state[:state_dim]
        
        return np.array(state, dtype=np.float32)
