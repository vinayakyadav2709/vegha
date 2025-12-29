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
        try:
            self.step = 0  # ✅ RESET STEP COUNTER

            max_steps = self.sumo.config.get("max_steps", 7200)

            while self.step < max_steps and self.sumo.simulation_running:
                if not self.sumo.simulation_paused:
                    # Check if connection is still alive (safety)
                    try:
                        traci.simulationStep()
                        # Sync step with actual SUMO time (handles resets)
                        current_time = traci.simulation.getTime()
                        self.step = int(current_time)
                    except traci.FatalTraCIError:
                        print("⚠️ TraCI connection lost. Stopping loop.")
                        break

                    self.events.update_event_statuses(self.step)
                    self.apply_traffic_light_control()

                    vehicles, traffic_lights = self.get_simulation_state()
                    self.broadcast_state(vehicles, traffic_lights)

                    self.step += 1

                eventlet.sleep(self.sumo.config.get("simulation_speed", 0.1))

            print("🛑 Simulation loop ended.")

        except Exception as e:
            print(f"❌ Simulation error: {e}")
            self.sumo.simulation_running = False

    def apply_traffic_light_control(self):
        """
        Priority Logic:
        Detects ambulances and forces the traffic light to Green for their specific lane.
        """
        if self.sumo.mode != "vegha":
            return

        try:
            # 1. Find all ambulances in the simulation
            ambulances = [
                v
                for v in traci.vehicle.getIDList()
                if ("truck" == self._get_vehicle_type(traci.vehicle.getTypeID(v)))
                or self._get_vehicle_type(traci.vehicle.getTypeID(v)) == "ambulance"
                or "emergency" in traci.vehicle.getTypeID(v).lower()
                or "truck" in traci.vehicle.getTypeID(v).lower()
            ]

            processed_tls = set()

            for amb_id in ambulances:
                next_tls_list = traci.vehicle.getNextTLS(amb_id)
                if not next_tls_list:
                    continue

                tls_id, tls_index, distance, state = next_tls_list[0]

                if distance > 100:
                    continue

                if tls_id in processed_tls:
                    continue

                try:
                    current_state = list(
                        traci.trafficlight.getRedYellowGreenState(tls_id)
                    )

                    if current_state[tls_index].lower() == "g":
                        continue

                    current_state[tls_index] = "G"
                    new_state = "".join(current_state)
                    traci.trafficlight.setRedYellowGreenState(tls_id, new_state)

                    processed_tls.add(tls_id)

                except Exception as e:
                    print(f"Priority Error: {e}")

        except Exception as e:
            pass

    def get_simulation_state(self):
        """Extract vehicles + REAL traffic lights only"""
        vehicles = {}
        traffic_lights = {}
        
        # Global Stats
        total_speed = 0
        waiting = 0
        count = 0

        # ✅ NEW: Dynamic Dictionary for Per-Type Stats
        # Structure: { 'car': {'count': 0, 'speed_sum': 0, 'waiting': 0}, 'bus': ... }
        type_stats = {}

        # ---------------- VEHICLES ----------------
        try:
            for v in traci.vehicle.getIDList():
                try:
                    road_id = traci.vehicle.getRoadID(v)

                    # Remove vehicles that will cross closed streets
                    try:
                        route_edges = traci.vehicle.getRoute(v)
                        if any(edge in self.sumo.closed_streets for edge in route_edges):
                            traci.vehicle.remove(v)
                            continue
                    except:
                        pass

                    if road_id in self.sumo.closed_streets:
                        continue

                    # Remove vehicles on active event streets
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

                    # Get Vehicle Data
                    x, y = traci.vehicle.getPosition(v)
                    lon, lat = traci.simulation.convertGeo(x, y, fromGeo=False)
                    angle = traci.vehicle.getAngle(v)
                    vtype = traci.vehicle.getTypeID(v)
                    speed = traci.vehicle.getSpeed(v)
                    speed_kmh = speed * 3.6
                    
                    # Determine Type
                    std_type = self._get_vehicle_type(vtype)

                    vehicles[v] = {
                        "pos": [lon, lat],
                        "angle": angle,
                        "type": std_type,
                    }
                    
                    # --- Global Stats ---
                    total_speed += speed_kmh
                    if speed < 0.1:
                        waiting += 1
                    count += 1

                    # --- ✅ NEW: Per-Type Stats Accumulation ---
                    if std_type not in type_stats:
                        type_stats[std_type] = {
                            "count": 0,
                            "speed_sum": 0,
                            "waiting": 0
                        }
                    
                    type_stats[std_type]["count"] += 1
                    type_stats[std_type]["speed_sum"] += speed_kmh
                    if speed < 0.1:
                        type_stats[std_type]["waiting"] += 1

                except:
                    pass
        except:
            pass

        # ---------------- TRAFFIC LIGHTS ----------------
        try:
            target_tls = (
                self.sumo.active_tls
                if hasattr(self.sumo, "active_tls") and self.sumo.active_tls
                else traci.trafficlight.getIDList()
            )

            for tl_id in target_tls:
                try:
                    if tl_id.startswith(":"): continue

                    controlled_lanes = traci.trafficlight.getControlledLanes(tl_id)
                    state = traci.trafficlight.getRedYellowGreenState(tl_id)

                    try:
                        logics = traci.trafficlight.getCompleteRedYellowGreenDefinition(tl_id)
                        if logics and len(logics) > 0:
                            if len(logics[0].phases) <= 1: continue
                    except:
                        pass

                    processed_roads = set()

                    for i, lane_id in enumerate(controlled_lanes):
                        road_id = traci.lane.getEdgeID(lane_id)
                        if road_id in processed_roads or road_id.startswith(":"): continue
                        processed_roads.add(road_id)

                        allowed_classes = traci.lane.getAllowed(lane_id)
                        relevant_classes = {"passenger", "bus", "truck", "trailer", "motorcycle", "moped", "taxi",
                   }
                        if allowed_classes:
                            if not any(c in allowed_classes for c in relevant_classes): continue

                        try:
                            if logics and len(logics) > 0:
                                current_logic = logics[0]
                                can_be_red = False
                                for p in current_logic.phases:
                                    if i < len(p.state) and "r" in p.state[i].lower():
                                        can_be_red = True
                                        break
                                if not can_be_red: continue
                        except:
                            pass

                        shape = traci.lane.getShape(lane_id)
                        if not shape or len(shape) < 2: continue

                        x1, y1 = shape[-2]
                        x2, y2 = shape[-1]
                        lon, lat = traci.simulation.convertGeo(x2, y2, fromGeo=False)
                        angle = math.degrees(math.atan2(y2 - y1, x2 - x1))

                        color = "green"
                        if i < len(state):
                            char = state[i].lower()
                            if "r" in char: color = "red"
                            elif "y" in char: color = "yellow"

                        display_id = f"{tl_id}_{road_id}"
                        traffic_lights[display_id] = {"pos": [lon, lat], "state": color, "angle": angle}
                except:
                    pass
        except:
            pass

        # Calculate Global Averages
        avg_speed = int(total_speed / count) if count > 0 else 0
        
        # ✅ NEW: Calculate Averages for Each Type
        final_type_stats = {}
        for t, data in type_stats.items():
            c = data["count"]
            avg_s = int(data["speed_sum"] / c) if c > 0 else 0
            final_type_stats[t] = {
                "count": c,
                "avg_speed": avg_s,
                "waiting": data["waiting"]
            }

        # Keep backward compatibility for Ambulance specific keys
        amb_data = final_type_stats.get("ambulance", {"count": 0, "avg_speed": 0, "waiting": 0})

        return vehicles, {
            "traffic_lights": traffic_lights,
            "avg_speed": avg_speed,
            "waiting": waiting,
            # Legacy keys (so your current frontend doesn't break)
            "amb_waiting": amb_data["waiting"],
            "amb_count": amb_data["count"],
            "amb_avg_speed": amb_data["avg_speed"],
            # ✅ NEW: Full breakdown
            "vehicle_stats": final_type_stats 
        }

    def broadcast_state(self, vehicles, tl_data):
        """Emit to all connected clients"""
        self.socketio.emit(
            "update",
            {
                "vehicles": vehicles,
                "traffic_lights": tl_data["traffic_lights"],
                "time": self.step,
                "avg_speed": tl_data["avg_speed"],
                "waiting": tl_data["waiting"],
                "events": [e.copy() for e in self.events.events],
                
                # Legacy Ambulance Stats
                "amb_waiting": tl_data["amb_waiting"],
                "amb_count": tl_data["amb_count"],
                "amb_avg_speed": tl_data["amb_avg_speed"],
                
                # ✅ NEW: Send the full breakdown to frontend
                "vehicle_stats": tl_data["vehicle_stats"]
            },
        )

    # motor,car,truck,bus
    def _get_vehicle_type(self, vtype):
        """Standardize vehicle type"""
        v = vtype.lower()
        if "bus" in v:
            return "bus"
        if "motorcycle" in v or "bike" in v:
            return "motorcycle"
        if "ambulance" in v or "emergency" in v:
            return "ambulance"
        # Note: You are currently mapping trucks to ambulances. 
        # If you want separate stats for trucks, change this return to "truck"
        if "truck" in v or "trailer" in v:
            return "ambulance" 
        if "default_vehtype" in v:
            return "car"
        return "car"

    def _get_tl_state(self, state):
        """Get traffic light state"""
        if "G" in state or "g" in state:
            return "green"
        elif "y" in state or "Y" in state:
            return "yellow"
        else:
            return "red"