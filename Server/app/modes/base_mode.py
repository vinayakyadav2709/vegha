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
                    traci.simulationStep()

                    self.events.update_event_statuses(self.step)
                    self.apply_traffic_light_control()

                    vehicles, traffic_lights = self.get_simulation_state()
                    self.broadcast_state(vehicles, traffic_lights)

                    self.step += 1

                eventlet.sleep(self.sumo.config.get("simulation_speed", 0.1))

            traci.close()
            self.sumo.simulation_running = False

        except Exception as e:
            print(f"❌ Simulation error: {e}")
            self.sumo.simulation_running = False

    def apply_traffic_light_control(self):
        """Override in subclass"""
        pass

    def get_simulation_state(self):
        """Extract vehicles + REAL traffic lights only"""
        vehicles = {}
        traffic_lights = {}
        total_speed = 0
        waiting = 0

        # ✅ FIX: Initialize 'count' here, safely at the top
        count = 0

        # ---------------- VEHICLES ----------------
        try:
            for v in traci.vehicle.getIDList():
                try:
                    road_id = traci.vehicle.getRoadID(v)

                    # Remove vehicles that will cross closed streets
                    try:
                        route_edges = traci.vehicle.getRoute(v)
                        if any(
                            edge in self.sumo.closed_streets for edge in route_edges
                        ):
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

                    x, y = traci.vehicle.getPosition(v)
                    lon, lat = traci.simulation.convertGeo(x, y, fromGeo=False)
                    angle = traci.vehicle.getAngle(v)
                    vtype = traci.vehicle.getTypeID(v)
                    speed = traci.vehicle.getSpeed(v)

                    vehicles[v] = {
                        "pos": [lon, lat],
                        "angle": angle,
                        "type": self._get_vehicle_type(vtype),
                    }

                    total_speed += speed * 3.6
                    if speed < 0.1:
                        waiting += 1

                    # ✅ Increment count here
                    count += 1

                except:
                    pass
        except:
            pass

        # ---------------- TRAFFIC LIGHTS ----------------
        try:
            # Use the active_tls set populated by sumo_manager
            # Fallback to all IDs if the set is empty (safety)
            target_tls = (
                self.sumo.active_tls
                if hasattr(self.sumo, "active_tls") and self.sumo.active_tls
                else traci.trafficlight.getIDList()
            )

            for tl_id in target_tls:
                try:
                    # Skip internal junctions (just in case)
                    if tl_id.startswith(":"):
                        continue

                    controlled_lanes = traci.trafficlight.getControlledLanes(tl_id)
                    state = traci.trafficlight.getRedYellowGreenState(tl_id)

                    # Rendering Logic: Draw one bar per incoming road
                    processed_roads = set()

                    for i, lane_id in enumerate(controlled_lanes):
                        road_id = traci.lane.getEdgeID(lane_id)

                        if road_id in processed_roads:
                            continue
                        if road_id.startswith(":"):
                            continue


                        processed_roads.add(road_id)

                        # ✅ Fix: Skip pedestrian traffic lights
                        # Only show if lane allows vehicles
                        allowed_classes = traci.lane.getAllowed(lane_id)
                        relevant_classes = {
                            "passenger",
                            "bus",
                            "truck",
                            "trailer",
                            "motorcycle",
                            "moped",
                            "taxi",
                        }
                        
                        # If list is empty, it allows all (keep it).
                        # If list is not empty, check if it intersects with relevant classes.
                        if allowed_classes:
                            if not any(c in allowed_classes for c in relevant_classes):
                                continue  # Skip this lane (pedestrian/bike only)

                        # Get coords
                        shape = traci.lane.getShape(lane_id)
                        if not shape or len(shape) < 2:
                            continue

                        x1, y1 = shape[-2]
                        x2, y2 = shape[-1]
                        lon, lat = traci.simulation.convertGeo(x2, y2, fromGeo=False)
                        angle = math.degrees(math.atan2(y2 - y1, x2 - x1))

                        # Color logic
                        color = "green"
                        if i < len(state):
                            char = state[i].lower()
                            if "r" in char:
                                color = "red"
                            elif "y" in char:
                                color = "yellow"

                        display_id = f"{tl_id}_{road_id}"

                        traffic_lights[display_id] = {
                            "pos": [lon, lat],
                            "state": color,
                            "angle": angle,
                        }
                except:
                    pass
        except:
            pass

        # ✅ Safe calculation using count
        avg_speed = int(total_speed / count) if count > 0 else 0

        return vehicles, {
            "traffic_lights": traffic_lights,
            "avg_speed": avg_speed,
            "waiting": waiting,
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
            },
        )

    def _get_vehicle_type(self, vtype):
        """Standardize vehicle type"""
        vtype_lower = vtype.lower()
        if "truck" in vtype_lower or "trailer" in vtype_lower:
            return "truck"
        elif "bus" in vtype_lower:
            return "bus"
        elif (
            "motorcycle" in vtype_lower
            or "bike" in vtype_lower
            or "moped" in vtype_lower
        ):
            return "motorcycle"
        elif "ambulance" in vtype_lower or "emergency" in vtype_lower:
            return "ambulance"
        else:
            return "passenger"

    def _get_tl_state(self, state):
        """Get traffic light state"""
        if "G" in state or "g" in state:
            return "green"
        elif "y" in state or "Y" in state:
            return "yellow"
        else:
            return "red"
