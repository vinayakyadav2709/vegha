import traci
import time
import subprocess
import os

# --- CONFIGURATION ---
SUMO_PORT = 9998
DOCKER_IMAGE = "ghcr.io/eclipse-sumo/sumo:latest"
WORKING_DIR = os.getcwd()
PROJECT_DIR = os.path.join(WORKING_DIR, "sumo-files")
CONFIG_FILE = "complex.sumocfg"


class JunctionAgent:
    """
    Note: 1 TLS manages the entire junction
    Manages a single Traffic Light System (TLS) in the network.
    Optimized to pre-compute state strings and look them up in O(1).
    """

    def __init__(self, tls_id):
        self.tls_id = tls_id

        # Topology Storage
        self.edges = []  # Sorted list of unique incoming edge IDs
        self.edge_to_green_state = {}  # Dict[EdgeID -> GreenString] (OPTIMIZATION)
        self.index_to_edge = []  # List mapping char index to EdgeID

        # State Tracking
        self.current_edge_idx = 0
        self.current_state_str = ""

        # State Machine Variables
        self.is_yellow = False
        self.yellow_steps_left = 0
        self.last_switch_time = 0

        # 1. Analyze Topology & Pre-compute Strings
        self._analyze_topology()

        # 2. Set Initial State (Green for first edge)
        if self.edges:
            initial_edge = self.edges[0]
            initial_green = self.edge_to_green_state[initial_edge]

            traci.trafficlight.setRedYellowGreenState(self.tls_id, initial_green)
            self.current_state_str = initial_green
            self.last_switch_time = 0  # Will be updated in first step if needed

    def _analyze_topology(self):
        """
        Maps incoming edges to phase strings and pre-generates the Green State for every edge.
        Run ONCE during initialization.
        """
        links = traci.trafficlight.getControlledLinks(self.tls_id)

        self.index_to_edge = []
        found_edges = set()  # set for uniqueness, we make set->list for storing later

        # Map character index to Edge ID
        for link in links:
            if link:
                edge = traci.lane.getEdgeID(link[0][0])
                self.index_to_edge.append(edge)
                found_edges.add(edge)
            else:
                self.index_to_edge.append(None)

        self.edges = sorted(list(found_edges))
        print(f"[{self.tls_id}] Controls edges: {self.edges}")

        # OPTIMIZATION: Pre-compute Green Strings
        # We generate the string "GGG..." for every possible target edge now.
        for target_edge in self.edges:
            s = ""
            for mapped_edge in self.index_to_edge:
                if mapped_edge == target_edge:
                    s += "G"  # Green for target
                else:
                    s += "r"  # Red for others
            self.edge_to_green_state[target_edge] = s

        print(
            f"[{self.tls_id}] Pre-computed {len(self.edge_to_green_state)} phase strings."
        )

    def _build_yellow_state(self, current_str):
        """
        Converts G/g to y. Done dynamically based on CURRENT state.
        """
        return "".join(["y" if c in ["G", "g", "y"] else "r" for c in current_str])

    def step(self, current_sim_time):
        """
        Called every simulation step. Handles Yellow transition and Cycling logic.
        """
        if not self.edges:
            return

        # 1. Handle Yellow Phase Countdown
        if self.is_yellow:
            self.yellow_steps_left -= 1
            if self.yellow_steps_left <= 0:
                # Yellow Done -> Switch to Next Green
                self.is_yellow = False

                # Cycle Logic: Next Edge in list
                self.current_edge_idx = (self.current_edge_idx + 1) % len(self.edges)
                next_edge = self.edges[self.current_edge_idx]

                # OPTIMIZATION: O(1) Lookup
                new_state = self.edge_to_green_state[next_edge]

                traci.trafficlight.setRedYellowGreenState(self.tls_id, new_state)
                self.current_state_str = new_state
                self.last_switch_time = current_sim_time
                # print(f"[{self.tls_id}] Switched Green for {next_edge}")

        # 2. Handle Green Phase Logic
        else:
            time_in_phase = current_sim_time - self.last_switch_time

            # Fixed Cycle Rule: Change every 30 seconds
            if time_in_phase > 30:
                # Initiate Switch

                # Apply Yellow to CURRENT state
                yellow_state = self._build_yellow_state(self.current_state_str)
                traci.trafficlight.setRedYellowGreenState(self.tls_id, yellow_state)

                self.is_yellow = True
                self.yellow_steps_left = 3  # 3 Simulation Steps

        # (Place GNN Data Collection Here later)


# --- DOCKER & MAIN LOOP ---


def start_sumo_docker():
    print(">> Launching SUMO in Docker...")
    cmd = [
        "docker",
        "run",
        "--rm",
        # --network=host shares port of container and host
        "--network=host",
        # Below 2 lines map the host port to container port, but there is some issue hence we are using --network=host
        # "-p",
        # f"{SUMO_PORT}:{SUMO_PORT}",
        "-e",
        f"DISPLAY={os.environ.get('DISPLAY', '')}",
        "-v",
        "/tmp/.X11-unix:/tmp/.X11-unix:rw",
        "-v",
        f"{os.environ.get('XAUTHORITY', '')}:/root/.Xauthority:rw",
        "-v",
        f"{PROJECT_DIR}:/sumo-projs",
        "-it",
        DOCKER_IMAGE,
        "sumo-gui",  # sumo-gui
        "-c",
        f"/sumo-projs/{CONFIG_FILE}",
        "--remote-port",
        str(SUMO_PORT),
        "--start",
        "--quit-on-end",
    ]
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    time.sleep(3)
    return process


def run():
    try:
        traci.init(port=SUMO_PORT, host="localhost")
    except Exception as e:
        print(f"FATAL: {e}")
        return

    # 1. Discover all Traffic Lights
    tls_ids = traci.trafficlight.getIDList()
    print(f">> Found {len(tls_ids)} Traffic Lights: {tls_ids}")

    # 2. Create Optimized Agents for each Junction
    agents = [JunctionAgent(tid) for tid in tls_ids]

    print(">> Starting Multi-Agent Control Loop...")
    step = 0

    while traci.simulation.getMinExpectedNumber() > 0:
        traci.simulationStep()
        curr_time = traci.simulation.getTime()

        # Update every agent in parallel
        for agent in agents:
            agent.step(curr_time)

        if step % 100 == 0:
            print(f"Step {step}: Simulation Running...")

        step += 1

    traci.close()
    print("\n>> Simulation completed successfully")


if __name__ == "__main__":
    proc = start_sumo_docker()
    try:
        run()
    except KeyboardInterrupt:
        print("\n>> Interrupted by user")
    finally:
        proc.kill()
        print(">> Docker process terminated")
