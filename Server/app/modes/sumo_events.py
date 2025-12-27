from .base_mode import BaseMode

class SUMOEventsMode(BaseMode):
    """SUMO + Events with fixed traffic light timing"""
    
    def __init__(self, sumo_manager, event_manager, socketio, config):
        super().__init__(sumo_manager, event_manager, socketio)
        self.config = config
    
    def apply_traffic_light_control(self):
        # Default SUMO timing - do nothing
        pass
