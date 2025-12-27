# inference_server.py - RL-Based Traffic Control

from flask import Flask, render_template, jsonify, send_file
from flask_socketio import SocketIO
import traci
import threading
import time
import torch
import yaml
import os
import sys
import math
import numpy as np

# Add FDRL to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'FDRL'))
from ppo_agent import Actor
from sumo_simulator import SumoSimulator

BOUNDS = {
    'min_lat': 52.520,
    'max_lat': 52.531,
    'min_lon': 13.385,
    'max_lon': 13.405
}

app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Global state
closed_streets = set()
available_streets = []
blocked_edges = {}
simulation_running = False
simulation_paused = False
simulation_speed = 0.1

# RL Model state
model_agents = {}
model_loaded = False
phase_timers = {}
use_rl_control = True

# Load config
CONFIG_PATH = os.path.join(os.path.dirname(__file__), '..', 'FDRL', 'config.yaml')

def load_config():
    """Load FDRL config"""
    try:
        with open(CONFIG_PATH, 'r') as f:
            return yaml.safe_load(f)
    except Exception as e:
        print(f"❌ Error loading config: {e}")
        return None

def load_rl_models(config):
    """Load trained RL models from saved_models folder"""
    global model_agents, model_loaded, phase_timers
    
    try:
        controlled_junctions = config['system']['controlled_junctions']
        model_save_path = config['system']['model_save_path']
        
        # Build full path to models
        fdrl_path = os.path.join(os.path.dirname(__file__), '..', 'FDRL')
        if not os.path.isabs(model_save_path):
            model_save_path = os.path.join(fdrl_path, model_save_path)
        
        print(f"🔍 Loading models from: {model_save_path}")
        
        for j_id in controlled_junctions:
            try:
                # Get junction info from SUMO
                links = traci.trafficlight.getControlledLinks(j_id)
                if not links:
                    print(f"⚠️  Junction {j_id} not found")
                    continue
                
                # Count incoming roads
                incoming_roads = set()
                for link_group in links:
                    if link_group[0]:
                        edge = link_group[0][0].split('_')[0]
                        incoming_roads.add(edge)
                
                state_dim = 2 * len(incoming_roads)  # [queue, wait_time] per road
                action_dim = len(incoming_roads)     # One phase per road
                
                print(f"   Junction {j_id}: state_dim={state_dim}, action_dim={action_dim}")
                
                # Load Actor model
                actor = Actor(
                    state_dim=state_dim,
                    action_dim=action_dim,
                    hidden_layers=config['model']['hidden_layers']
                )
                
                # Load weights
                model_file = os.path.join(model_save_path, f"{j_id}_actor.pth")
                if os.path.exists(model_file):
                    actor.load_state_dict(torch.load(model_file, map_location='cpu'))
                    actor.eval()
                    print(f"   ✅ Loaded model: {model_file}")
                else:
                    print(f"   ⚠️  Model not found: {model_file}")
                    # Use untrained model
                
                model_agents[j_id] = {
                    'actor': actor,
                    'incoming_roads': list(incoming_roads),
                    'state_dim': state_dim,
                    'action_dim': action_dim
                }
                phase_timers[j_id] = 0
                
            except Exception as e:
                print(f"   ❌ Error loading model for {j_id}: {e}")
        
        model_loaded = len(model_agents) > 0
        
        if model_loaded:
            print(f"✅ Successfully loaded {len(model_agents)} RL models")
            return True
        else:
            print("❌ No models loaded!")
            return False
            
    except Exception as e:
        print(f"❌ Critical error loading models: {e}")
        import traceback
        traceback.print_exc()
        return False

def get_junction_state(junction_id, model_config):
    """Extract state from SUMO for junction"""
    try:
        state = []
        
        for road in model_config['incoming_roads']:
            try:
                # Get queue length
                vehicles = traci.edge.getLastStepVehicleIDs(road)
                queue = sum(1 for v in vehicles if traci.vehicle.getSpeed(v) < 0.1)
                
                # Get waiting time
                wait_time = sum(traci.vehicle.getWaitingTime(v) for v in vehicles)
                
                state.extend([queue, wait_time])
            except:
                state.extend([0, 0])
        
        return np.array(state, dtype=np.float32)
    except Exception as e:
        print(f"Error getting state for {junction_id}: {e}")
        return np.zeros(model_config['state_dim'], dtype=np.float32)

def apply_rl_action(junction_id, action):
    """Apply RL model action to traffic light"""
    try:
        # Get all phases for this junction
        logic = traci.trafficlight.getAllProgramLogics(junction_id)[0]
        num_phases = len(logic.phases)
        
        # Map action to phase
        target_phase = action % num_phases
        traci.trafficlight.setPhase(junction_id, target_phase)
        
        return True
    except Exception as e:
        print(f"Error applying action for {junction_id}: {e}")
        return False

# ============ Flask Routes ============

@app.route('/')
def index():
    return send_file('frame.html')

@app.route('/style.css')
def serve_css():
    return send_file('style.css', mimetype='text/css')

@app.route('/api/streets')
def get_streets():
    global available_streets
    if simulation_running:
        load_available_streets()
    
    return jsonify({
        'streets': available_streets,
        'total': len(available_streets),
        'closed': list(closed_streets)
    })

@app.route('/api/metrics')
def get_metrics():
    return jsonify({
        'status': 'connected',
        'closed_streets': list(closed_streets),
        'available_streets': len(available_streets),
        'rl_enabled': use_rl_control,
        'models_loaded': model_loaded,
        'junctions_controlled': len(model_agents)
    })

# ============ Helper Functions ============

def get_vehicle_type(vtype):
    vtype_lower = vtype.lower()
    if 'truck' in vtype_lower or 'trailer' in vtype_lower:
        return 'truck'
    elif 'bus' in vtype_lower:
        return 'bus'
    elif 'motorcycle' in vtype_lower or 'bike' in vtype_lower:
        return 'motorcycle'
    elif 'ambulance' in vtype_lower or 'emergency' in vtype_lower:
        return 'ambulance'
    else:
        return 'passenger'

def get_traffic_light_state(state):
    if 'G' in state or 'g' in state:
        return 'green'
    elif 'y' in state or 'Y' in state:
        return 'yellow'
    else:
        return 'red'

def load_available_streets():
    """Load ONLY MAJOR streets (big roads with multiple lanes)"""
    global available_streets
    try:
        edge_list = traci.edge.getIDList()
        available_streets = []
        
        print("🔍 Filtering MAJOR streets in bounded region...")
        for edge in edge_list:
            if edge.startswith(':'):
                continue
            
            try:
                lanes = traci.edge.getLaneNumber(edge)
                if lanes < 2:
                    continue
                
                lane_id = edge + '_0'
                shape = traci.lane.getShape(lane_id)
                
                in_bounds = False
                for x, y in shape:
                    lon, lat = traci.simulation.convertGeo(x, y)
                    if (BOUNDS['min_lat'] <= lat <= BOUNDS['max_lat'] and 
                        BOUNDS['min_lon'] <= lon <= BOUNDS['max_lon']):
                        in_bounds = True
                        break
                
                if in_bounds:
                    available_streets.append(edge)
            except:
                continue
        
        print(f"✅ Loaded {len(available_streets)} MAJOR streets")
        socketio.emit('streets_loaded', {
            'streets': available_streets,
            'total': len(available_streets)
        })
    except Exception as e:
        print(f"❌ Error loading streets: {e}")
        available_streets = []

def get_edge_geometry(edge_id):
    """Get the geographical coordinates of an edge for drawing"""
    try:
        lanes = traci.edge.getLaneNumber(edge_id)
        if lanes > 0:
            lane_id = edge_id + '_0'
            shape = traci.lane.getShape(lane_id)
            
            coords = []
            for x, y in shape:
                lon, lat = traci.simulation.convertGeo(x, y)
                coords.append([lat, lon])
            
            return coords
    except Exception as e:
        print(f"Error getting geometry for {edge_id}: {e}")
    return None

# ============ MAIN SIMULATION LOOP - RL POWERED ============

def run_sumo_with_rl():
    """Main simulation loop with RL-based traffic control"""
    global simulation_running, simulation_paused, model_agents, model_loaded
    
    print("🚀 Starting SUMO simulation with RL control...")
    
    try:
        # Start SUMO
        print("🔗 Connecting to SUMO...")
        traci.start(["sumo", "-c", "Berlin/osm.sumocfg", "--no-warnings", "true"])
        print("✅ Connected to SUMO")
        
        # Load streets
        load_available_streets()
        
        # Load RL models
        config = load_config()
        if not config:
            print("❌ Failed to load config, falling back to fixed-time control")
            use_rl_control = False
        else:
            if use_rl_control:
                load_rl_models(config)
        
        green_time = config.get('fdrl', {}).get('green_time', 30) if config else 30
        yellow_time = config.get('fdrl', {}).get('yellow_time', 3) if config else 3
        
        step = 0
        last_phase_change = {}
        
        while step < 7200 and simulation_running:
            if not simulation_paused:
                traci.simulationStep()
                
                # ====== RL TRAFFIC LIGHT CONTROL ======
                if use_rl_control and model_loaded:
                    for j_id, agent_config in model_agents.items():
                        try:
                            # Check if it's time to change phase
                            last_change = last_phase_change.get(j_id, -green_time)
                            time_since_change = step - last_change
                            
                            if time_since_change >= green_time:
                                # Get current state
                                state = get_junction_state(j_id, agent_config)
                                
                                # Model inference
                                with torch.no_grad():
                                    state_tensor = torch.FloatTensor(state).unsqueeze(0)
                                    action = torch.argmax(
                                        agent_config['actor'](state_tensor), dim=1
                                    ).item()
                                
                                # Apply action
                                apply_rl_action(j_id, action)
                                last_phase_change[j_id] = step
                                
                                print(f"🚦 Junction {j_id}: action={action}, time={step}")
                        except Exception as e:
                            print(f"Error in RL control for {j_id}: {e}")
                
                # ====== Get Vehicles ======
                vehicles = {}
                total_speed = 0
                waiting = 0
                count = 0
                
                for v in traci.vehicle.getIDList():
                    try:
                        road_id = traci.vehicle.getRoadID(v)
                        
                        # Check if on closed street
                        try:
                            route_edges = traci.vehicle.getRoute(v)
                            will_cross_blocked = any(edge in closed_streets for edge in route_edges)
                            
                            if will_cross_blocked or road_id in closed_streets:
                                traci.vehicle.remove(v)
                                continue
                        except:
                            pass
                        
                        if road_id in closed_streets:
                            continue
                        
                        x, y = traci.vehicle.getPosition(v)
                        lon, lat = traci.simulation.convertGeo(x, y)
                        angle = traci.vehicle.getAngle(v)
                        vtype = traci.vehicle.getTypeID(v)
                        speed = traci.vehicle.getSpeed(v)
                        
                        vehicles[v] = {
                            'pos': [lon, lat],
                            'angle': angle,
                            'type': get_vehicle_type(vtype)
                        }
                        
                        total_speed += speed * 3.6
                        if speed < 0.1:
                            waiting += 1
                        count += 1
                    except:
                        pass
                
                # ====== Get Traffic Lights ======
                traffic_lights = {}
                for tl_id in traci.trafficlight.getIDList():
                    try:
                        links = traci.trafficlight.getControlledLinks(tl_id)
                        if links:
                            lane = links[0][0][0]
                            shape = traci.lane.getShape(lane)
                            x, y = shape[-1]
                            lon, lat = traci.simulation.convertGeo(x, y)
                            state = traci.trafficlight.getRedYellowGreenState(tl_id)
                            
                            if len(shape) >= 2:
                                x1, y1 = shape[-2]
                                x2, y2 = shape[-1]
                                angle = math.degrees(math.atan2(y2 - y1, x2 - x1))
                            else:
                                angle = 0
                            
                            traffic_lights[tl_id] = {
                                'pos': [lon, lat],
                                'state': get_traffic_light_state(state),
                                'angle': angle
                            }
                    except:
                        pass
                
                avg_speed = int(total_speed / count) if count > 0 else 0
                
                # Emit update
                socketio.emit('update', {
                    'vehicles': vehicles,
                    'traffic_lights': traffic_lights,
                    'time': step,
                    'avg_speed': avg_speed,
                    'waiting': waiting
                })
                
                step += 1
            else:
                time.sleep(0.1)
        
        traci.close()
        simulation_running = False
        print("✅ Simulation finished")
        
    except Exception as e:
        print(f"❌ Simulation error: {e}")
        import traceback
        traceback.print_exc()
        simulation_running = False

# ============ SocketIO Events ============

@socketio.on('start')
def handle_start():
    global simulation_running, simulation_paused
    simulation_paused = False
    if not simulation_running:
        simulation_running = True
        print("▶️  Starting simulation...")
        threading.Thread(target=run_sumo_with_rl, daemon=True).start()

@socketio.on('pause')
def handle_pause():
    global simulation_paused
    simulation_paused = not simulation_paused
    print(f"⏸️  Simulation {'paused' if simulation_paused else 'resumed'}")

@socketio.on('reset')
def handle_reset():
    global simulation_running, closed_streets
    simulation_running = False
    closed_streets.clear()
    print("🔄 Simulation reset")

@socketio.on('speed')
def handle_speed(data):
    global simulation_speed
    simulation_speed = 0.1 / data['speed']
    print(f"⚡ Speed: {data['speed']}x")

@socketio.on('get_streets')
def handle_get_streets():
    if simulation_running:
        load_available_streets()
        socketio.emit('streets_list', {
            'streets': available_streets,
            'total': len(available_streets),
            'closed': list(closed_streets)
        })

@socketio.on('close_street')
def handle_close_street(data):
    global closed_streets
    street = data.get('street')
    
    if not street or not simulation_running:
        return
    
    try:
        traci.edge.setDisallowed(street, ['passenger', 'taxi', 'bus', 'truck', 'trailer', 
                                           'motorcycle', 'moped', 'bicycle', 'pedestrian',
                                           'emergency', 'delivery'])
        
        vehicles_on_edge = traci.edge.getLastStepVehicleIDs(street)
        for veh_id in vehicles_on_edge:
            try:
                traci.vehicle.remove(veh_id)
            except:
                pass
        
        closed_streets.add(street)
        edge_coords = get_edge_geometry(street)
        
        print(f"🚫 Street CLOSED: {street}")
        
        socketio.emit('street_status', {
            'success': True,
            'action': 'closed',
            'street': street,
            'closed_streets': list(closed_streets),
            'edge_coords': edge_coords
        })
    except Exception as e:
        socketio.emit('street_status', {'success': False, 'error': str(e)})

@socketio.on('open_street')
def handle_open_street(data):
    global closed_streets
    street = data.get('street')
    
    if not street or street not in closed_streets:
        return
    
    try:
        traci.edge.setAllowed(street, ['passenger', 'taxi', 'bus', 'truck', 'trailer',
                                        'motorcycle', 'moped', 'bicycle', 'pedestrian',
                                        'emergency', 'delivery'])
        
        closed_streets.discard(street)
        print(f"✅ Street OPENED: {street}")
        
        socketio.emit('street_status', {
            'success': True,
            'action': 'opened',
            'street': street,
            'closed_streets': list(closed_streets)
        })
    except Exception as e:
        socketio.emit('street_status', {'success': False, 'error': str(e)})

if __name__ == '__main__':
    print("=" * 60)
    print("🚦 Vegha Traffic Management System")
    print("=" * 60)
    print("🤖 RL-Based Traffic Control ENABLED")
    print("=" * 60)
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
