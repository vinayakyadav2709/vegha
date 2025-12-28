import traci
import os
import sys


class SUMOManager:
    def __init__(self, config):
        self.config = config
        self.simulation_running = False
        self.simulation_paused = False
        self.closed_streets = set()
        self.available_streets = []
        self.street_names = {}  # Cache for street names {id: name}
        self.bounds = config.get("bounds")
        self.step = 0
        self.mode = "vegha"

        # 1. Prepare the SUMO Command (Path logic moved here)
        self.sumo_cmd = self._get_sumo_cmd()

        # 2. Start SUMO immediately
        print("🚀 Initializing SUMO...")
        traci.start(self.sumo_cmd)

        # 3. Detect or Load Active TLS
        controlled_junctions = self.config.get("system", {}).get("controlled_junctions", [])
        if controlled_junctions:
            print(f"📋 Using {len(controlled_junctions)} controlled junctions from config.")
            # Verify they exist in simulation to avoid errors
            existing_tls = set(traci.trafficlight.getIDList())
            self.active_tls = set([j for j in controlled_junctions if j in existing_tls])
        else:
             self.active_tls = self._detect_active_tls()

        # 4. Reset to Time 0 and load streets
        self._reset_internal()
        print("✅ SUMO initialized, warmed up, and waiting at Time 0.")

    def _get_sumo_cmd(self):
        """Helper to construct the SUMO command string"""
        sumo_config = self.config.get("simulation", {}).get("sumo_config")

        if not os.path.isabs(sumo_config):
            sumo_server_dir = os.path.dirname(
                os.path.dirname(os.path.dirname(__file__))
            )
            sumo_config = os.path.join(sumo_server_dir, sumo_config)

        if not os.path.exists(sumo_config):
            raise FileNotFoundError(f"Not found: {sumo_config}")

        return [
            "sumo",
            "-c",
            sumo_config,
            "--no-warnings",
            "true",
            "--step-length",
            "1",
        ]

    def _detect_active_tls(self):
        """Runs 100 steps to find which signals actually change."""
        print("🕵️  Detecting active traffic lights (running 100 steps)...")
        active_set = set()

        # Snapshot initial state of all signals
        initial_states = {}
        all_tls = traci.trafficlight.getIDList()

        for tl in all_tls:
            # Skip internal junctions immediately
            if tl.startswith(":"):
                continue
            try:
                initial_states[tl] = traci.trafficlight.getRedYellowGreenState(tl)
            except:
                pass

        # Fast-forward 100 steps
        for _ in range(100):
            traci.simulationStep()

            # Check who changed
            for tl in list(initial_states.keys()):
                try:
                    current_state = traci.trafficlight.getRedYellowGreenState(tl)
                    if current_state != initial_states[tl]:
                        active_set.add(tl)
                        del initial_states[tl]  # Optimization
                except:
                    pass

        print(
            f"✅ Detection complete. Found {len(active_set)} active signals out of {len(all_tls)}."
        )
        return active_set

    def _reset_internal(self):
        """Resets SUMO to time 0 without killing the process"""
        # traci.load reloads the config using the arguments (excluding the binary name)
        traci.load(self.sumo_cmd[1:])
        self.load_available_streets()
        self.step = 0

    def start_simulation(self):
        """Called when user clicks Play. SUMO is already open, just unpause."""
        self.simulation_running = True
        self.simulation_paused = False
        print("▶️ Simulation marked as running")

    def reset_simulation(self):
        """Called when user clicks Reset."""
        self.simulation_running = False
        self.simulation_paused = False
        self.closed_streets.clear()
        self._reset_internal()
        print("🔄 Simulation reset to Time 0")

    def load_available_streets(self):
        self.available_streets = []

        # Optional: Set programs if needed
        all_junctions = traci.trafficlight.getIDList()
        for jid in all_junctions:
            try:
                programs = traci.trafficlight.getAllProgramLogics(jid)
                if programs:
                    traci.trafficlight.setProgram(jid, programs[0].programID)
            except:
                pass

        try:
            for edge_id in traci.edge.getIDList():
                if edge_id.startswith(":"):
                    continue

                try:
                    lane_id = f"{edge_id}_0"
                    shape = traci.lane.getShape(lane_id)

                    for x, y in shape:
                        lon, lat = traci.simulation.convertGeo(x, y, fromGeo=False)

                        if (
                            self.bounds["min_lat"] <= lat <= self.bounds["max_lat"]
                            and self.bounds["min_lon"] <= lon <= self.bounds["max_lon"]
                        ):
                            
                            # Get Human Readable Name (if available)
                            try:
                                name = traci.edge.getStreetName(edge_id)
                                if name and name.strip():  # Check if not empty
                                    self.street_names[edge_id] = name
                            except:
                                pass
                                
                            self.available_streets.append(edge_id)
                            break
                except:
                    self.available_streets.append(edge_id)

            print(f"✅ Loaded {len(self.available_streets)} streets ({len(self.street_names)} with names)")

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
