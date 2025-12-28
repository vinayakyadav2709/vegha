import traci


def register_socketio_handlers(socketio, sumo_mgr, event_mgr, mode):
    """Register all SocketIO event handlers"""

    @socketio.on("connect")
    def handle_connect():
        """Send streets with coordinates on connect"""
        import traci

        streets_data = []

        try:
            # Get all edges from SUMO
            all_edges = traci.edge.getIDList()
            print(f"📍 Loading {len(all_edges)} streets...")

            for edge_id in all_edges:
                # Skip internal junctions
                if edge_id.startswith(":"):
                    continue

                try:
                    # Get first lane of edge for shape
                    lane_id = edge_id + "_0"
                    shape = traci.lane.getShape(lane_id)

                    # Convert to lat/lon coordinates
                    coords = []
                    for x, y in shape:
                        lon, lat = traci.simulation.convertGeo(x, y, fromGeo=False)
                        coords.append([lat, lon])  # Leaflet uses [lat, lon]

                    if coords and len(coords) >= 2:  # Only streets with valid paths
                        streets_data.append({"name": edge_id, "coordinates": coords})
                except:
                    pass

            print(f"✅ Loaded {len(streets_data)} streets with coordinates")

            # Emit with coordinates for map drawing
            socketio.emit(
                "streets_loaded",
                {
                    "streets": [s["name"] for s in streets_data],
                    "streets_with_coords": streets_data,  # ← KEY: HTML uses this to draw on map
                    "total": len(streets_data),
                },
            )
        except Exception as e:
            print(f"❌ Error loading streets: {e}")
            socketio.emit(
                "streets_loaded", {"streets": [], "streets_with_coords": [], "total": 0}
            )

    @socketio.on("start")
    def handle_start():
        # Start background loop ONCE
        if not getattr(sumo_mgr, "loop_started", False):
            sumo_mgr.loop_started = True
            socketio.start_background_task(target=mode.run)

        # Resume simulation
        sumo_mgr.start_simulation()

        # Reset events ONLY when starting fresh
        event_mgr.events.clear()
        event_mgr.event_id_counter = 1

        print("▶️ Simulation started")

    @socketio.on("pause")
    def handle_pause():
        sumo_mgr.simulation_paused = not sumo_mgr.simulation_paused
        print(f"⏸️  Simulation {'paused' if sumo_mgr.simulation_paused else 'resumed'}")

    @socketio.on("reset")
    def handle_reset():
        sumo_mgr.simulation_running = False
        sumo_mgr.simulation_paused = False  # ✅ ADD
        sumo_mgr.closed_streets.clear()
        event_mgr.events.clear()

        try:
            traci.close()  # ✅ ADD (important)
        except:
            pass

        socketio.emit("event_update", [])
        print("🔄 Simulation reset")

    @socketio.on("speed")
    def handle_speed(data):
        sumo_mgr.config["simulation_speed"] = 0.1 / data.get("speed", 1)

    @socketio.on("get_streets")
    def handle_get_streets():
        """Get list of all streets"""
        socketio.emit(
            "streets_list",
            {
                "streets": sumo_mgr.available_streets,
                "total": len(sumo_mgr.available_streets),
                "closed": list(sumo_mgr.closed_streets),
            },
        )

    @socketio.on("close_street")
    def handle_close_street(data):
        """Close a street immediately"""
        street = data.get("street")

        if not street:
            socketio.emit(
                "street_status", {"success": False, "error": "No street specified"}
            )
            return

        if not sumo_mgr.simulation_running:
            socketio.emit(
                "street_status", {"success": False, "error": "Simulation not running"}
            )
            return

        try:
            import traci

            # Get edge coordinates for visualization
            edge_coords = []
            try:
                lane_id = street + "_0"
                shape = traci.lane.getShape(lane_id)
                for x, y in shape:
                    lon, lat = traci.simulation.convertGeo(x, y, fromGeo=False)
                    edge_coords.append([lat, lon])
            except:
                pass

            # Close the street
            traci.edge.setDisallowed(
                street,
                [
                    "passenger",
                    "taxi",
                    "bus",
                    "truck",
                    "trailer",
                    "motorcycle",
                    "moped",
                    "bicycle",
                    "pedestrian",
                    "emergency",
                    "delivery",
                ],
            )

            # Remove vehicles on this street
            vehicles_on_edge = traci.edge.getLastStepVehicleIDs(street)
            for veh_id in vehicles_on_edge:
                try:
                    traci.vehicle.remove(veh_id)
                except:
                    pass

            sumo_mgr.closed_streets.add(street)

            print(f"🚫 Street CLOSED: {street}")

            socketio.emit(
                "street_status",
                {
                    "success": True,
                    "action": "closed",
                    "street": street,
                    "message": f"Street {street} closed",
                    "closed_streets": list(sumo_mgr.closed_streets),
                    "edge_coords": edge_coords,
                },
            )
        except Exception as e:
            print(f"❌ Error closing street: {e}")
            socketio.emit("street_status", {"success": False, "error": str(e)})

    @socketio.on("open_street")
    def handle_open_street(data):
        """Reopen a closed street"""
        street = data.get("street")

        if not street:
            socketio.emit(
                "street_status", {"success": False, "error": "No street specified"}
            )
            return

        if not sumo_mgr.simulation_running:
            socketio.emit(
                "street_status", {"success": False, "error": "Simulation not running"}
            )
            return

        try:
            import traci

            # Open the street
            traci.edge.setAllowed(
                street,
                [
                    "passenger",
                    "taxi",
                    "bus",
                    "truck",
                    "trailer",
                    "motorcycle",
                    "moped",
                    "bicycle",
                    "pedestrian",
                    "emergency",
                    "delivery",
                ],
            )

            sumo_mgr.closed_streets.discard(street)

            print(f"✅ Street OPENED: {street}")

            socketio.emit(
                "street_status",
                {
                    "success": True,
                    "action": "opened",
                    "street": street,
                    "message": f"Street {street} opened",
                    "closed_streets": list(sumo_mgr.closed_streets),
                },
            )
        except Exception as e:
            print(f"❌ Error opening street: {e}")
            socketio.emit("street_status", {"success": False, "error": str(e)})

    @socketio.on("disconnect")
    def handle_disconnect():
        print("❌ Client disconnected")
