import sys
import random
from lxml import etree

if len(sys.argv) != 4:
    print(
        "Usage: python scale_trips_preserve_xml.py input.trips.xml scale output.trips.xml"
    )
    sys.exit(1)

inp, scale, out = sys.argv[1], float(sys.argv[2]), sys.argv[3]

random.seed(42)

# Parse with comment preservation
parser = etree.XMLParser(remove_comments=False)
tree = etree.parse(inp, parser)
root = tree.getroot()

# Find ALL trip elements (direct children or nested)
trips = root.findall(".//trip")

total = len(trips)
keep = int(total * scale)

print(f"Total trips: {total}")
print(f"Keeping {keep} trips ({scale * 100:.1f}%)")

# Randomly select trips to keep
selected = set(random.sample(range(total), keep))

for i, trip in enumerate(trips):
    if i not in selected:
        parent = trip.getparent()
        parent.remove(trip)

# Write back, preserving formatting as much as possible
tree.write(out, encoding="utf-8", xml_declaration=True, pretty_print=True)

print(f"✓ Written scaled trips to {out}")


# numbers:
# bus: 189,2065, motor: 755,3442, veh: 1133,6885, truck: 377,1377
# ▶️ Use it EXACTLY like this
# Passenger
# python3 scale_trips_preserve_xml.py \
#   sumo_files/dy/osm.passenger.trips.xml \
#   0.2 \
#   sumo_files/dy/osm.passenger.trips_scaled.xml

# Motorcycle
# python3 scale_trips_preserve_xml.py \
#   sumo_files/dy/osm.motorcycle.trips.xml \
#   0.4 \
#   sumo_files/dy/osm.motorcycle.trips_scaled.xml

# Bus
# python3 scale_trips_preserve_xml.py \
#   sumo_files/dy/osm.bus.trips.xml \
#   0.27 \
#   sumo_files/dy/osm.bus.trips_scaled.xml

# Truck
# python3 scale_trips_preserve_xml.py \
#   sumo_files/dy/osm.truck.trips.xml \
#   0.25 \
#   sumo_files/dy/osm.truck.trips_scaled.xml
