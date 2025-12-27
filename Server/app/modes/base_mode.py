import traci
import eventlet
import math

class BaseMode:
    """Base simulation class"""
    
    def __init__(self, sumo_manager, event_manager, socketio):
        self.sumo = sumo_manager
        self.events = event_manager
        self.socketio = socketio
        self.step = 0
    
    def run(self):
        """Main simulation loop"""
        try:
            self.sumo.start_simulation()
            self.sumo.simulation_running = True
            max_steps = self.sumo.config.get('max_steps', 7200)
            
            while self.step < max_steps and self.sumo.simulation_running:
                if not self.sumo.simulation_paused:
                    traci.simulationStep()
                    self.events.update_event_statuses(self.step)
                    self.apply_traffic_light_control()
                    vehicles, traffic_lights = self.get_simulation_state()
                    self.broadcast_state(vehicles, traffic_lights)
                    self.step += 1
                
                eventlet.sleep(self.sumo.config.get('simulation_speed', 0.1))
            
            traci.close()
            self.sumo.simulation_running = False
            
        except Exception as e:
            print(f"❌ Simulation error: {e}")
            self.sumo.simulation_running = False
    
    def apply_traffic_light_control(self):
        """Override in subclass"""
        pass
    
    def get_simulation_state(self):
        """Extract vehicles + traffic lights"""
        vehicles = {}
        traffic_lights = {}
        total_speed = 0
        waiting = 0
        count = 0
        
        try:
            for v in traci.vehicle.getIDList():
                try:
                    road_id = traci.vehicle.getRoadID(v)
                    
                    # Check route
                    try:
                        route_edges = traci.vehicle.getRoute(v)
                        will_cross_blocked = any(edge in self.sumo.closed_streets for edge in route_edges)
                        
                        if will_cross_blocked or road_id in self.sumo.closed_streets:
                            traci.vehicle.remove(v)
                            continue
                    except:
                        pass
                    
                    # Skip closed streets
                    if road_id in self.sumo.closed_streets:
                        continue
                    
                    # Skip active event streets
                    skip = False
                    for event in self.events.events:
                        if event["status"] == "Active" and road_id in event["streets"]:
                            try:
                                traci.vehicle.remove(v)
                            except:
                                pass
                            skip = True
                            break
                    
                    if skip:
                        continue
                    
                    x, y = traci.vehicle.getPosition(v)
                    lon, lat = traci.simulation.convertGeo(x, y, fromGeo=False)
                    angle = traci.vehicle.getAngle(v)
                    vtype = traci.vehicle.getTypeID(v)
                    speed = traci.vehicle.getSpeed(v)
                    
                    vehicles[v] = {
                        'pos': [lon, lat],
                        'angle': angle,
                        'type': self._get_vehicle_type(vtype)
                    }
                    
                    total_speed += speed * 3.6
                    if speed < 0.1:
                        waiting += 1
                    count += 1
                except:
                    pass
        except:
            pass
        
        # Get traffic lights
        try:
            for tl_id in traci.trafficlight.getIDList():
                try:
                    links = traci.trafficlight.getControlledLinks(tl_id)
                    if links:
                        lane = links[0][0][0]
                        shape = traci.lane.getShape(lane)
                        x, y = shape[-1]
                        lon, lat = traci.simulation.convertGeo(x, y, fromGeo=False)
                        state = traci.trafficlight.getRedYellowGreenState(tl_id)
                        
                        if len(shape) >= 2:
                            x1, y1 = shape[-2]
                            x2, y2 = shape[-1]
                            angle = math.degrees(math.atan2(y2 - y1, x2 - x1))
                        else:
                            angle = 0
                        
                        traffic_lights[tl_id] = {
                            'pos': [lon, lat],
                            'state': self._get_tl_state(state),
                            'angle': angle
                        }
                except:
                    pass
        except:
            pass
        
        avg_speed = int(total_speed / count) if count > 0 else 0
        
        return vehicles, {'traffic_lights': traffic_lights, 'avg_speed': avg_speed, 'waiting': waiting}
    
    def broadcast_state(self, vehicles, tl_data):
        """Emit to all connected clients - MATCHES OLD server.py"""
        self.socketio.emit('update', {
            'vehicles': vehicles,
            'traffic_lights': tl_data['traffic_lights'],
            'time': self.step,
            'avg_speed': tl_data['avg_speed'],
            'waiting': tl_data['waiting']
        })
    
    def _get_vehicle_type(self, vtype):
        """Standardize vehicle type"""
        vtype_lower = vtype.lower()
        if 'truck' in vtype_lower or 'trailer' in vtype_lower:
            return 'truck'
        elif 'bus' in vtype_lower:
            return 'bus'
        elif 'motorcycle' in vtype_lower or 'bike' in vtype_lower or 'moped' in vtype_lower:
            return 'motorcycle'
        elif 'ambulance' in vtype_lower or 'emergency' in vtype_lower:
            return 'ambulance'
        else:
            return 'passenger'
    
    def _get_tl_state(self, state):
        """Get traffic light state"""
        if 'G' in state or 'g' in state:
            return 'green'
        elif 'y' in state or 'Y' in state:
            return 'yellow'
        else:
            return 'red'

    def broadcast_state(self, vehicles, tl_data):
        """Emit with events"""
        self.socketio.emit('update', {
            'vehicles': vehicles,
            'traffic_lights': tl_data['traffic_lights'],
            'time': self.step,
            'avg_speed': tl_data['avg_speed'],
            'waiting': tl_data['waiting'],
            'events': [e.copy() for e in self.events.events]  # ← ADD THIS
        })

