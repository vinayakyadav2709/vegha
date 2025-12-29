import os
import subprocess
import time
import traci


def start_sumo_docker(project_dir, config_file, port=9999, gui=True):
    """Launches SUMO container. Returns subprocess object."""
    docker_image = "ghcr.io/eclipse-sumo/sumo:latest"
    binary = "sumo-gui" if gui else "sumo"

    print(f">> Launching SUMO ({binary}) in Docker...")

    cmd = [
        "docker",
        "run",
        "--rm",
        "-p",
        f"{port}:{port}",
        "-e",
        f"DISPLAY={os.environ.get('DISPLAY', '')}",
        "-v",
        "/tmp/.X11-unix:/tmp/.X11-unix:rw",
        "-v",
        f"{os.environ.get('XAUTHORITY', '')}:/root/.Xauthority:rw",
        "-v",
        f"{project_dir}:/sumo-projs",
        docker_image,
        binary,
        "-c",
        f"/sumo-projs/{config_file}",
        "--remote-port",
        str(port),
        "--start",
        "--quit-on-end",
    ]

    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    print(">> Waiting 3s for SUMO initialization...")
    time.sleep(3)
    return process


def get_controlled_lanes(tls_id):
    """
    Returns Dictionary: { 'EdgeID': ['LaneID_1', 'LaneID_2', ...] }
    Only lanes controlled by this traffic light.
    """
    links = traci.trafficlight.getControlledLinks(tls_id)
    edge_lanes_map = {}

    for link_group in links:
        if not link_group:
            continue

        incoming_lane = link_group[0][0]
        edge_id = traci.lane.getEdgeID(incoming_lane)

        if edge_id not in edge_lanes_map:
            edge_lanes_map[edge_id] = set()
        edge_lanes_map[edge_id].add(incoming_lane)

    # Convert to sorted lists
    for edge in edge_lanes_map:
        edge_lanes_map[edge] = sorted(list(edge_lanes_map[edge]))

    return edge_lanes_map


class Normalizer:
    """Normalizes traffic features to [0, 1] range."""

    def __init__(self):
        self.max_queue = 50.0
        self.max_wait = 300.0
        self.max_speed = 20.0
        self.max_vol = 10.0

    def scale(self, features):
        queue, wait, speed, vol, occ = features
        return [
            min(queue / self.max_queue, 1.0),
            min(wait / self.max_wait, 1.0),
            min(speed / self.max_speed, 1.0),
            min(vol / self.max_vol, 1.0),
            occ,
        ]


def get_aggregated_features(lane_ids, normalizer=None):
    """
    Aggregates metrics for a list of lanes.
    Used for both Edge Features and Global Context.
    """
    total_queue = 0
    total_wait = 0
    total_vol = 0
    avg_speed = 0
    avg_occ = 0
    count = 0

    for lane_id in lane_ids:
        try:
            total_queue += traci.lane.getLastStepHaltingNumber(lane_id)
            total_wait += traci.lane.getWaitingTime(lane_id)
            total_vol += traci.lane.getLastStepVehicleNumber(lane_id)
            avg_speed += traci.lane.getLastStepMeanSpeed(lane_id)
            avg_occ += traci.lane.getLastStepOccupancy(lane_id)
            count += 1
        except traci.exceptions.TraCIException:
            continue

    if count > 0:
        avg_speed /= count
        avg_occ /= count

    raw = [total_queue, total_wait, avg_speed, total_vol, avg_occ]

    if normalizer:
        return normalizer.scale(raw)
    return raw


def compute_reward(all_lane_ids, normalizer=None):
    """
    Global Reward: Minimize total waiting time.
    Normalized to same scale as features.
    """
    total_wait = 0
    for lane in all_lane_ids:
        try:
            total_wait += traci.lane.getWaitingTime(lane)
        except:
            pass

    # Normalize reward to similar scale as features
    if normalizer:
        normalized_wait = min(total_wait / normalizer.max_wait, 1.0)
        return -normalized_wait

    return -(total_wait / 100.0)
