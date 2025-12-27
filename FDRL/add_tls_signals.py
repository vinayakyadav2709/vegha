import sumolib
import subprocess
import os
import sys
import tempfile
import math

# ================= CONFIG =================
NET_IN = "sumo_files/dy/osm.net.xml.gz"
NET_OUT = "sumo_files/dy/osm_tls.net.xml.gz"

MERGE_DIST_M = 25.0  # merge junctions within 25 meters
MIN_CLUSTER_EDGES = 3  # signalize if merged cluster has >=3 edges
# =========================================


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


if not os.path.exists(NET_IN):
    print(f"ERROR: {NET_IN} not found")
    sys.exit(1)

print("Reading network...")
net = sumolib.net.readNet(NET_IN)

nodes = net.getNodes()

# ---- STEP 1: cluster nearby junctions ----
clusters = []
visited = set()

for n in nodes:
    if n.getID() in visited:
        continue

    cluster = [n]
    visited.add(n.getID())

    for m in nodes:
        if m.getID() in visited:
            continue
        if dist(n.getCoord(), m.getCoord()) <= MERGE_DIST_M:
            cluster.append(m)
            visited.add(m.getID())

    clusters.append(cluster)

print(f"Formed {len(clusters)} junction clusters")

# ---- STEP 2: evaluate clusters ----
tls_nodes = []
already_tls = 0

for cluster in clusters:
    incoming_edges = set()
    representative = cluster[0]

    for node in cluster:
        for e in node.getIncoming():
            incoming_edges.add(e.getID())

    if len(incoming_edges) >= MIN_CLUSTER_EDGES:
        # choose representative node
        if representative.getType() == "traffic_light":
            already_tls += 1
        tls_nodes.append(representative.getID())

print(f"Selected {len(tls_nodes)} merged intersections for traffic lights")
print(f"Already had traffic lights: {already_tls}")
print(f"New traffic lights to be added: {len(tls_nodes) - already_tls}")

if not tls_nodes:
    print("WARNING: no junctions selected")
    sys.exit(0)

# ---- STEP 3: call netconvert ----
tls_ids = ",".join(tls_nodes)

print("Running netconvert to add traffic lights...")
cmd = [
    "netconvert",
    "--sumo-net-file",
    NET_IN,
    "--output-file",
    NET_OUT,
    "--tls.set",
    tls_ids,
    "--tls.default-type",
    "actuated",
    "--tls.yellow.time",
    "3",
]

subprocess.run(cmd, check=True)

print("DONE")
print(f"Final network written to: {NET_OUT}")
