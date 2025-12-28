import subprocess
import os
import sys

# --- CONFIGURATION ---
DOCKER_IMAGE = "ghcr.io/eclipse-sumo/sumo:latest"
PROJECT_DIR = os.path.expanduser("~/sumo-projs/dy_new")
OUTPUT_NET = "training_net.net.xml"

# Change to project directory
os.makedirs(PROJECT_DIR, exist_ok=True)
os.chdir(PROJECT_DIR)

# Find input file
INPUT_NET = None
for candidate in ["osm_tls.net.xml", "osm.net.xml", "osm.net.xml.gz"]:
    if os.path.exists(candidate):
        INPUT_NET = candidate
        break

if not INPUT_NET:
    print("Error: No input file found (osm_tls.net.xml or osm.net.xml)")
    sys.exit(1)

print(f"Processing {INPUT_NET}...")

# --- BUILD NETCONVERT COMMAND ---
netconvert_args = [
    "netconvert",
    "--sumo-net-file", INPUT_NET,
    "--output-file", OUTPUT_NET,
    
    # 1. VISUALS: GET ROAD NAMES
    "--output.street-names", "true",
    
    # 2. FIX TRAFFIC LIGHTS (The "Stuck" Issue)
    # Aggressively merge close nodes (up to 30 meters!)
    "--junctions.join", "true",
    "--junctions.join-dist", "30", 
    # Merge traffic lights that are close
    "--tls.join", "true",
    "--tls.join-dist", "30",
    # Stop the "Green/Dark Green" confusion by simplifying the layout
    "--tls.layout", "incoming",
    # Fix the "No Detector" warning by using timed lights
    "--tls.default-type", "static",

    # 3. CLEAN UP GEOMETRY
    "--remove-edges.by-vclass", "pedestrian,bicycle",
    "--sidewalks.guess", "false",
    "--crossings.guess", "false",
    "--geometry.remove", "true",
    "--remove-edges.isolated", "true",
    "--keep-edges.by-vclass", "passenger,bus,truck,motorcycle,taxi,delivery",
    "--no-turnarounds.tls", "true",
    "--default.lanewidth", "3.2"
]

# --- RUN DOCKER ---
docker_cmd = [
    "docker", "run", "--rm",
    "-v", f"{PROJECT_DIR}:/sumo-projs",
    "--workdir", "/sumo-projs",
    DOCKER_IMAGE
] + netconvert_args

try:
    print("Running aggressive cleaning...")
    subprocess.run(docker_cmd, check=True)
    print("="*60)
    print(f"SUCCESS! Map saved as: {OUTPUT_NET}")
    print("Changes applied:")
    print("1. Split traffic lights merged (30m radius).")
    print("2. Street names imported (View in GUI settings).")
    print("3. Traffic lights set to 'static' (No detector errors).")
    print("="*60)
except subprocess.CalledProcessError:
    print("Error during netconvert.")
