import traci
import os


class SUMOManager:
    def __init__(self, config):
        self.config = config
        self.simulation_running = False
        self.simulation_paused = False
        self.closed_streets = set()
        self.available_streets = []
        self.bounds = config.get("bounds")
        self.step = 0
        self.mode = "vegha"  # or fixed

    def start_simulation(self):
        sumo_config = self.config.get("sumo_config", "coldplay/osm.sumocfg")

        if not os.path.isabs(sumo_config):
            sumo_server_dir = os.path.dirname(
                os.path.dirname(os.path.dirname(__file__))
            )
            sumo_config = os.path.join(sumo_server_dir, sumo_config)

        print(f"📂 SUMO Config: {sumo_config}")

        if not os.path.exists(sumo_config):
            raise FileNotFoundError(f"Not found: {sumo_config}")

        sumo_cmd = [
            "sumo",
            "-c",
            sumo_config,
            "--no-warnings",
            "true",
            "--step-length",
            "1",
        ]

        traci.start(sumo_cmd)
        print("✅ SUMO started")
        self.load_available_streets()

    def load_available_streets(self):
        """Filter streets by BOUNDS"""
        self.available_streets = []
        all_junctions = traci.trafficlight.getIDList()
        if self.mode == "default" or self.mode == "vegha":
            for jid in all_junctions:
                try:
                    traci.trafficlight.setProgram(jid, "0")

                except:
                    pass

        elif self.mode == "fixed":
            for jid in all_junctions:
                try:
                    traci.trafficlight.setProgram(jid, "fixed_60")
                except:
                    pass
        try:
            for edge_id in traci.edge.getIDList():
                # Skip internal edges
                if edge_id.startswith(":"):
                    continue

                # Try to get coordinates
                try:
                    # For SUMO 1.24+, use getLaneShape instead
                    lanes = traci.edge.getLaneNumber(edge_id)
                    if lanes > 0:
                        lane_id = f"{edge_id}_0"
                        shape = traci.lane.getShape(lane_id)

                        if shape:
                            for x, y in shape:
                                lon, lat = traci.simulation.convertGeo(
                                    x, y, fromGeo=False
                                )

                                if (
                                    self.bounds["min_lat"]
                                    <= lat
                                    <= self.bounds["max_lat"]
                                    and self.bounds["min_lon"]
                                    <= lon
                                    <= self.bounds["max_lon"]
                                ):
                                    self.available_streets.append(edge_id)
                                    break
                except:
                    # If conversion fails, just add edge anyway
                    self.available_streets.append(edge_id)

            print(f"✅ Loaded {len(self.available_streets)} streets")

        except Exception as e:
            print(f"⚠️ Error loading streets: {e}")

    def get_edge_geometry(self, edge_id):
        try:
            shape = traci.edge.getShape(edge_id)
            coords = []
            for x, y in shape:
                lon, lat = traci.simulation.convertGeo(x, y, fromGeo=False)
                coords.append([lon, lat])
            return coords
        except:
            return []

    def close_simulation(self):
        try:
            traci.close()
            self.simulation_running = False
        except:
            pass
