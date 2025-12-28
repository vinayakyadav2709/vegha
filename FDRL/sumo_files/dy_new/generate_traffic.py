import subprocess
import os
import sys

# --- CONFIGURATION ---
NET_FILE = "training_net.net.xml"
DOCKER_IMAGE = "ghcr.io/eclipse-sumo/sumo:latest"

# Define traffic settings
TRAFFIC_CONFIG = [
    {"class": "passenger",  "period": 2.0,  "length": 5.0,  "width": 1.8},
    {"class": "truck",      "period": 10.0, "length": 12.0, "width": 2.5},
    {"class": "bus",        "period": 15.0, "length": 12.0, "width": 2.5},
    {"class": "motorcycle", "period": 8.0,  "length": 2.5,  "width": 1.0},
]

current_dir = os.path.abspath(os.getcwd())

# 1. Create vtypes.add.xml
print("Creating vtypes.add.xml...")
with open("vtypes.add.xml", "w") as f:
    f.write('<additional>\n')
    for conf in TRAFFIC_CONFIG:
        cls = conf["class"]
        f.write(f'    <vType id="{cls}_type" vClass="{cls}" guiShape="{cls}" '
                f'length="{conf["length"]}" width="{conf["width"]}" maxSpeed="30.0"/>\n')
    f.write('</additional>')

generated_files = []

# 2. Run RandomTrips inside Docker
print(f"\nGenerating traffic using Docker image: {DOCKER_IMAGE}")
print("-" * 60)

for conf in TRAFFIC_CONFIG:
    vclass = conf["class"]
    period = str(conf["period"])
    filename = f"trips.{vclass}.xml"
    
    print(f"Processing {vclass} (Period: {period}s)...")
    
    docker_cmd = [
        "docker", "run", "--rm",
        "-v", f"{current_dir}:/data",
        "-w", "/data",
        DOCKER_IMAGE,
        "sh", "-c",
        f"python3 $SUMO_HOME/tools/randomTrips.py "
        f"-n {NET_FILE} "
        f"-o {filename} "
        f"--edge-permission {vclass} "
        # FIX: Add a unique prefix to prevent ID collision (e.g. 'bus0', 'truck0')
        f"--prefix {vclass} " 
        f"--trip-attributes 'type=\"{vclass}_type\"' "
        f"--additional-files vtypes.add.xml "
        f"--validate "
        f"--end 3600"
    ]
    
    try:
        subprocess.run(docker_cmd, check=True)
        generated_files.append(filename)
        print(f"✓ Created {filename}")
    except subprocess.CalledProcessError:
        print(f"❌ Error generating {vclass} traffic.")

print("-" * 60)
print("SUCCESS. Run the simulation now.")
print("-" * 60)

