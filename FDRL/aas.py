from matplotlib.dates import SU
import traci
from collections import defaultdict

SUMO_CFG = "/mnt/Windows-SSD/Users/yvavi/yeet/coding/projects/delhi/Code-Slayer-FDRL-Traffic/FDRL/sumo_files/mulund/osm.sumocfg"
SUMO_CFG = "/mnt/Windows-SSD/Users/yvavi/yeet/coding/projects/delhi/Code-Slayer-FDRL-Traffic/FDRL/sumo_files/dy/osm.sumocfg"
traci.start(["sumo", "-c", SUMO_CFG, "--no-step-log"])

depart_times = []

while traci.simulation.getMinExpectedNumber() > 0:
    traci.simulationStep()
    for vid in traci.simulation.getDepartedIDList():
        depart_times.append(traci.simulation.getTime())

traci.close()

total = len(depart_times)
t0, t1 = min(depart_times), max(depart_times)
vph = total / ((t1 - t0) / 3600)

print(f"Total vehicles: {total}")
print(f"Vehicles/hour: {vph:.1f}")
