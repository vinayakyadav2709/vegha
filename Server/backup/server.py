from flask import Flask, render_template, jsonify
from flask_socketio import SocketIO
import traci
import threading
import time
from flask import Flask, send_file, jsonify

BOUNDS = {
    'min_lat': 52.520,
    'max_lat': 52.531,
    'min_lon': 13.385,
    'max_lon': 13.405
}
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# Store closed streets and available streets
closed_streets = set()
available_streets = []
blocked_edges = {}

@app.route('/')
def index():
    return send_file('frame.html')

@app.route('/api/streets')
def get_streets():
    """API endpoint to get list of all available streets/edges - DYNAMIC"""
    global available_streets
    
    # Dynamically fetch current streets from SUMO if simulation is running
    if simulation_running:
        load_available_streets()  # Use the bounded filter function

    
    return jsonify({
        'streets': available_streets,
        'total': len(available_streets),
        'closed': list(closed_streets)
    })

@app.route('/style.css')
def serve_css():
    return send_file('style.css', mimetype='text/css')


@app.route('/api/metrics')
def get_metrics():
    """API endpoint for metrics"""
    return jsonify({
        'status': 'connected',
        'closed_streets': list(closed_streets),
        'available_streets': len(available_streets)
    })

simulation_running = False
simulation_paused = False
simulation_speed = 0.1

def get_all_edge_lanes(edge_id):
    """Get all lanes for an edge"""
    try:
        num_lanes = traci.edge.getLaneNumber(edge_id)
        return [f"{edge_id}_{i}" for i in range(num_lanes)]
    except:
        return []


def get_vehicle_type(vtype):
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
                # Only include streets with 2+ lanes (major roads)
                lanes = traci.edge.getLaneNumber(edge)
                if lanes < 2:
                    continue
                
                # Check if within bounds
                lane_id = edge + '_0'
                shape = traci.lane.getShape(lane_id)
                
                # Check if any point is within bounds
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

def run_sumo():
    global simulation_running, simulation_paused
    print("Starting SUMO simulation...")
    traci.start(["sumo", "-c", "Berlin/osm.sumocfg"])
    
    load_available_streets()
    
    step = 0
    while step < 7200 and simulation_running:
        if not simulation_paused:
            traci.simulationStep()
            vehicles = {}
            traffic_lights = {}
            total_speed = 0
            waiting = 0
            count = 0
            
                        # Get vehicles (HIDE vehicles on closed streets)
            # Get vehicles (REMOVE vehicles that will use blocked streets)
            for v in traci.vehicle.getIDList():
                try:
                    # Get current road and route
                    road_id = traci.vehicle.getRoadID(v)
                    
                    # Check if vehicle will cross any blocked street in its route
                    try:
                        route_edges = traci.vehicle.getRoute(v)
                        will_cross_blocked = any(edge in closed_streets for edge in route_edges)
                        
                        # Remove vehicle if it will cross a blocked street
                        if will_cross_blocked or road_id in closed_streets:
                            traci.vehicle.remove(v)
                            continue
                    except:
                        pass
                    
                    # Skip if on closed street
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

            
            # Get traffic lights with lane angle
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
                            import math
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
            
            socketio.emit('update', {
                'vehicles': vehicles,
                'traffic_lights': traffic_lights,
                'time': step,
                'avg_speed': avg_speed,
                'waiting': waiting
            })
            step += 1
        
        time.sleep(simulation_speed)
    
    traci.close()
    simulation_running = False
    print("Simulation finished")


@socketio.on('start')
def handle_start():
    global simulation_running, simulation_paused
    simulation_paused = False
    if not simulation_running:
        simulation_running = True
        threading.Thread(target=run_sumo, daemon=True).start()

@socketio.on('pause')
def handle_pause():
    global simulation_paused
    simulation_paused = True

@socketio.on('reset')
def handle_reset():
    global simulation_running, closed_streets
    simulation_running = False
    closed_streets.clear()

@socketio.on('speed')
def handle_speed(data):
    global simulation_speed
    simulation_speed = 0.1 / data['speed']

@socketio.on('get_streets')
def handle_get_streets():
    """Socket event to get street list - DYNAMIC"""
    if simulation_running:
        load_available_streets()  # This uses BOUNDS filtering
        
        socketio.emit('streets_list', {
            'streets': available_streets,
            'total': len(available_streets),
            'closed': list(closed_streets)
        })
    else:
        socketio.emit('streets_list', {
            'streets': [],
            'total': 0,
            'closed': [],
            'error': 'Simulation not running'
        })

@socketio.on('close_street')
def handle_close_street(data):
    """Close/block a street and REMOVE all vehicles on it"""
    global closed_streets
    street = data.get('street')
    
    if not street:
        socketio.emit('street_status', {'success': False, 'error': 'No street specified'})
        return
    
    if not simulation_running:
        socketio.emit('street_status', {'success': False, 'error': 'Simulation not running'})
        return
    
    try:
        if street not in available_streets:
            socketio.emit('street_status', {'success': False, 'error': f'Street "{street}" not found'})
            return
        
        if street in closed_streets:
            socketio.emit('street_status', {'success': False, 'error': f'Street already closed'})
            return
        
        edge_coords = get_edge_geometry(street)
        
        # Block the edge
        traci.edge.setDisallowed(street, ['passenger', 'taxi', 'bus', 'truck', 'trailer', 
                                           'motorcycle', 'moped', 'bicycle', 'pedestrian',
                                           'emergency', 'delivery'])
        
        # REMOVE all vehicles currently on this edge
        vehicles_on_edge = traci.edge.getLastStepVehicleIDs(street)
        removed_count = 0
        for veh_id in vehicles_on_edge:
            try:
                traci.vehicle.remove(veh_id)
                removed_count += 1
            except:
                pass
        
        closed_streets.add(street)
        
        print(f"🚫 Street CLOSED: {street} - Removed {removed_count} vehicles")
        
        socketio.emit('street_status', {
            'success': True,
            'action': 'closed',
            'street': street,
            'message': f'Street {street} closed - {removed_count} vehicles removed',
            'closed_streets': list(closed_streets),
            'edge_coords': edge_coords
        })
        
    except Exception as e:
        print(f"❌ Error closing street {street}: {e}")
        socketio.emit('street_status', {'success': False, 'error': str(e)})




@socketio.on('open_street')
def handle_open_street(data):
    """Reopen a closed street"""
    global closed_streets
    street = data.get('street')
    
    if not street:
        socketio.emit('street_status', {
            'success': False,
            'error': 'No street specified'
        })
        return
    
    if not simulation_running:
        socketio.emit('street_status', {
            'success': False,
            'error': 'Simulation not running'
        })
        return
    
    try:
        if street not in closed_streets:
            socketio.emit('street_status', {
                'success': False,
                'error': f'Street "{street}" is not closed',
                'street': street
            })
            return
        
        traci.edge.setAllowed(street, ['passenger', 'taxi', 'bus', 'truck', 'trailer',
                                        'motorcycle', 'moped', 'bicycle', 'pedestrian',
                                        'emergency', 'delivery'])
        
        closed_streets.discard(street)
        
        print(f"✅ Street OPENED: {street}")
        
        socketio.emit('street_status', {
            'success': True,
            'action': 'opened',
            'street': street,
            'message': f'Street {street} opened successfully',
            'closed_streets': list(closed_streets)
        })
        
    except Exception as e:
        print(f"❌ Error opening street {street}: {e}")
        socketio.emit('street_status', {
            'success': False,
            'error': str(e),
            'street': street
        })

if __name__ == '__main__':
    print("=" * 60)
    print("🚦 Vegha Traffic Management System")
    print("=" * 60)
    print("Starting Flask-SocketIO server...")
    print("Server available at: http://localhost:5000")
    print("=" * 60)
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
