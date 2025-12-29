import os
import subprocess

# --- CONFIGURATION ---
DOCKER_IMAGE = "ghcr.io/eclipse-sumo/sumo:latest"
PROJECT_DIR = os.path.expanduser("~/sumo-projs/single")
NET_NAME = "complex.net.xml"
ROUTE_NAME = "complex.rou.xml"
CFG_NAME = "complex.sumocfg"

# --- 1. DEFINE TOPOLOGY ---
nodes_xml = """<nodes>
    <!-- MAIN INTERSECTIONS (All explicitly typed as traffic_light) -->
    <node id="C" x="0" y="0" type="traffic_light"/>
    <node id="N" x="0" y="400" type="traffic_light"/>
    <node id="S" x="0" y="-400" type="traffic_light"/>
    <node id="E" x="400" y="0" type="traffic_light"/>
    <node id="W" x="-400" y="0" type="traffic_light"/>

    <!-- THE CROSSING INTERSECTION (200, 200) -->
    <!-- We MUST define this node to stop lines passing through each other -->
    <node id="X_NE" x="200" y="200" type="traffic_light"/>
    
    <!-- End of Diagonal -->
    <node id="NE" x="350" y="350" type="traffic_light"/>

    <!-- EXITS (Sources/Sinks) -->
    <node id="Exit_N" x="0" y="800"/>
    <node id="Exit_S" x="0" y="-800"/>
    <node id="Exit_E" x="800" y="0"/>
    <node id="Exit_W" x="-800" y="0"/>
    <node id="Exit_NE" x="600" y="600"/>
</nodes>"""

edges_xml = """<edges>
    <!-- 1. CENTER (5-Way) CONNECTIONS -->
    <edge id="N2C" from="N" to="C" priority="3" numLanes="1" speed="13.89"/> <edge id="C2N" from="C" to="N" priority="3" numLanes="1" speed="13.89"/>
    <edge id="S2C" from="S" to="C" priority="3" numLanes="1" speed="13.89"/> <edge id="C2S" from="C" to="S" priority="3" numLanes="1" speed="13.89"/>
    <edge id="E2C" from="E" to="C" priority="3" numLanes="1" speed="13.89"/> <edge id="C2E" from="C" to="E" priority="3" numLanes="1" speed="13.89"/>
    <edge id="W2C" from="W" to="C" priority="3" numLanes="1" speed="13.89"/> <edge id="C2W" from="C" to="W" priority="3" numLanes="1" speed="13.89"/>

    <!-- Center to X_NE -->
    <edge id="C2X" from="C" to="X_NE" priority="3" numLanes="1" speed="13.89"/>
    <edge id="X2C" from="X_NE" to="C" priority="3" numLanes="1" speed="13.89"/>

    <!-- 2. THE NEW INTERSECTION (X_NE) SPLIT CONNECTIONS -->
    <!-- X_NE <-> NE -->
    <edge id="X2NE" from="X_NE" to="NE" priority="2" numLanes="1" speed="13.89"/>
    <edge id="NE2X" from="NE" to="X_NE" priority="2" numLanes="1" speed="13.89"/>

    <!-- X_NE <-> N (North) -->
    <edge id="X2N" from="X_NE" to="N" priority="2" numLanes="1" speed="13.89"/>
    <edge id="N2X" from="N" to="X_NE" priority="2" numLanes="1" speed="13.89"/>

    <!-- X_NE <-> E (East) -->
    <edge id="X2E" from="X_NE" to="E" priority="2" numLanes="1" speed="13.89"/>
    <edge id="E2X" from="E" to="X_NE" priority="2" numLanes="1" speed="13.89"/>

    <!-- 3. OUTER BOUNDARIES & EXITS -->
    <edge id="In_S" from="Exit_S" to="S" priority="2" numLanes="1" speed="13.89"/> <edge id="Out_S" from="S" to="Exit_S" priority="2" numLanes="1" speed="13.89"/>
    <edge id="S2W" from="S" to="W" priority="2" numLanes="1" speed="13.89"/> <edge id="W2S" from="W" to="S" priority="2" numLanes="1" speed="13.89"/>
    <edge id="S2E" from="S" to="E" priority="2" numLanes="1" speed="13.89"/> <edge id="E2S" from="E" to="S" priority="2" numLanes="1" speed="13.89"/>

    <edge id="In_N" from="Exit_N" to="N" priority="2" numLanes="1" speed="13.89"/> <edge id="Out_N" from="N" to="Exit_N" priority="2" numLanes="1" speed="13.89"/>

    <edge id="In_E" from="Exit_E" to="E" priority="2" numLanes="1" speed="13.89"/> <edge id="Out_E" from="E" to="Exit_E" priority="2" numLanes="1" speed="13.89"/>

    <edge id="In_W" from="Exit_W" to="W" priority="2" numLanes="1" speed="13.89"/> <edge id="Out_W" from="W" to="Exit_W" priority="2" numLanes="1" speed="13.89"/>

    <edge id="In_NE" from="Exit_NE" to="NE" priority="2" numLanes="1" speed="13.89"/> <edge id="Out_NE" from="NE" to="Exit_NE" priority="2" numLanes="1" speed="13.89"/>

</edges>"""

with open(os.path.join(PROJECT_DIR, "complex.nod.xml"), "w") as f:
    f.write(nodes_xml)
with open(os.path.join(PROJECT_DIR, "complex.edg.xml"), "w") as f:
    f.write(edges_xml)


# --- 2. DOCKER HELPERS ---
def run_in_docker(command_list):
    docker_cmd = [
        "docker",
        "run",
        "--rm",
        "-v",
        f"{PROJECT_DIR}:/sumo-projs",
        "--workdir",
        "/sumo-projs",
        DOCKER_IMAGE,
    ] + command_list
    subprocess.run(docker_cmd, check=True)


# --- 3. GENERATE NETWORK (Force TLS) ---
print(">> Generating Network...")
run_in_docker(
    [
        "netconvert",
        "--node-files=complex.nod.xml",
        "--edge-files=complex.edg.xml",
        "--output-file=" + NET_NAME,
        "--lefthand",
        "--tls.layout",
        "incoming",
        "--tls.default-type",
        "static",
        # CRITICAL: Force guessing traffic lights if types are missed
        "--tls.guess",
        "true",
        "--tls.guess.threshold",
        "0",
        "--no-turnarounds",
        "--junctions.join",
    ]
)

print(">> Generating Light Traffic (Density Reduced)...")
run_in_docker(
    [
        "python",
        "/usr/share/sumo/tools/randomTrips.py",
        "-n",
        NET_NAME,
        "-o",
        ROUTE_NAME,
        "-e",
        "3600",
        "-p",
        "2.0",  # One car every 3 seconds
        "--validate",
        "--fringe-factor",
        "50",
    ]
)

# --- 4. CONFIG ---
sumo_cfg = f"""<configuration>
    <input>
        <net-file value="{NET_NAME}"/>
        <route-files value="{ROUTE_NAME}"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="3600"/>
    </time>
    <processing>
        <time-to-teleport value="-1"/>
        <ignore-junction-blocker value="1"/>
    </processing>
</configuration>"""

with open(os.path.join(PROJECT_DIR, CFG_NAME), "w") as f:
    f.write(sumo_cfg)
print(f">> Setup Complete: {CFG_NAME}")
