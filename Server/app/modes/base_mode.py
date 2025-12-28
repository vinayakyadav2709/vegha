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

            # Only close if explicit shutdown requested, NOT during mode switch/reset
            # if self.sumo.simulation_running is False, it might be a reset.
            # We let sumo_manager handle full shutdown.
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
                if self._get_vehicle_type(traci.vehicle.getTypeID(v)) == "ambulance"
            ]

            processed_tls = set()

            for amb_id in ambulances:
                # Get the next traffic light the ambulance is approaching
                # returns list of (tlsID, tlsIndex, distance, state)
                next_tls_list = traci.vehicle.getNextTLS(amb_id)

                if not next_tls_list:
                    continue

                # Get the immediate next traffic light
                tls_id, tls_index, distance, state = next_tls_list[0]

                # Only prioritize if within reasonable distance (e.g., 100m)
                if distance > 100:
                    continue

                if tls_id in processed_tls:
                    continue

                # 2. Force Green Logic
                # We need to know which link index corresponds to the ambulance's lane
                # The 'tls_index' returned by getNextTLS tells us exactly which link index in the TLS controls this lane.

                try:
                    # Get current state of the traffic light (e.g., "GrGr")
                    current_state = list(
                        traci.trafficlight.getRedYellowGreenState(tls_id)
                    )

                    # If the ambulance's light is already Green (G or g), do nothing
                    if current_state[tls_index].lower() == "g":
                        continue

                    # 3. Override the Traffic Light
                    # We set the ambulance's specific link to GREEN ('G')
                    # We set conflicting links to RED (This is a simple brute-force priority)

                    # Ideally, we should find a valid phase, but for "Emergency Priority",
                    # forcing the state is the most effective way to demonstrate speed.

                    # Set specific link to Green
                    current_state[tls_index] = "G"

                    # Optional: If you want to be safer, you might want to turn others red,
                    # but simply turning this one Green is usually enough for the demo.
                    # To be safe, let's just apply this modified state.

                    new_state = "".join(current_state)
                    traci.trafficlight.setRedYellowGreenState(tls_id, new_state)

                    processed_tls.add(tls_id)
                    # print(f"🚑 Priority granted to {amb_id} at {tls_id}")

                except Exception as e:
                    print(f"Priority Error: {e}")

        except Exception as e:
            pass

    def get_simulation_state(self):
        """Extract vehicles + REAL traffic lights only"""
        vehicles = {}
        traffic_lights = {}
        total_speed = 0
        waiting = 0

        # ✅ FIX: Initialize 'count' here, safely at the top
        count = 0
        amb_waiting = 0
        amb_count = 0
        amb_total_speed = 0
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
                    std_type = self._get_vehicle_type(vtype)
                    total_speed += speed * 3.6
                    speed_kmh = speed * 3.6
                    if speed < 0.1:
                        waiting += 1
                    if std_type == "ambulance":
                        amb_count += 1
                        amb_total_speed += speed_kmh
                        if speed < 0.1:
                            amb_waiting += 1

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

                    # ✅ Fix: Skip single-phase (static) traffic lights
                    # These create clutter and cause RL errors if we try to switch them
                    try:
                        # getCompleteRedYellowGreenDefinition returns a list of logics.
                        # We need the currently active one (usually index 0 or matches programID)
                        # For simple filtering, checking the first one is usually sufficient as they share structure
                        logics = traci.trafficlight.getCompleteRedYellowGreenDefinition(
                            tl_id
                        )
                        if logics and len(logics) > 0:
                            current_logic = logics[0]
                            # If only 1 phase, it's static (always green/red/yellow)
                            if len(current_logic.phases) <= 1:
                                continue
                    except:
                        pass  # Fallback if API fails, though unlikely

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

                        # ✅ Fix: Skip lanes that NEVER turn Red (Always Green/Yellow)
                        # Used to hide continuous flow lanes
                        try:
                            # Use logics fetched above or fetch again safely
                            # 'logics' variable from line 139 is available in this scope
                            if logics and len(logics) > 0:
                                current_logic = logics[0]
                                can_be_red = False
                                for p in current_logic.phases:
                                    if i < len(p.state):
                                        char = p.state[i].lower()
                                        if "r" in char:
                                            can_be_red = True
                                            break
                                if not can_be_red:
                                    # LOGGING (Temporary for Debugging)
                                    # print(f"Skipping ALWAYS-GREEN lane {lane_id} at {tl_id}")
                                    continue  # Skip this lane, it's always green/yellow
                        except:
                            pass

                        # ✅ Fix: Skip lanes that NEVER turn Red (Always Green/Yellow)
                        # Used to hide continuous flow lanes
                        try:
                            # Use logics fetched above or fetch again safely
                            # 'logics' variable from line 139 is available in this scope
                            if logics and len(logics) > 0:
                                current_logic = logics[0]
                                can_be_red = False
                                for p in current_logic.phases:
                                    if i < len(p.state):
                                        char = p.state[i].lower()
                                        if "r" in char:
                                            can_be_red = True
                                            break
                                if not can_be_red:
                                    continue  # Skip this lane, it's always green/yellow
                        except:
                            pass

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
        amb_avg_speed = int(amb_total_speed / amb_count) if amb_count > 0 else 0
        return vehicles, {
            "traffic_lights": traffic_lights,
            "avg_speed": avg_speed,
            "waiting": waiting,
            "amb_waiting": amb_waiting,
            "amb_count": amb_count,
            "amb_avg_speed": amb_avg_speed,
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
                "amb_waiting": tl_data["amb_waiting"],
                "amb_count": tl_data["amb_count"],
                "amb_avg_speed": tl_data["amb_avg_speed"],
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
