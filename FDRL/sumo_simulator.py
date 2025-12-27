"""
SUMO Simulator with Priority-Aware State and Reward Calculation
"""

import os
import sys
import numpy as np
import traci
import warnings
from collections import defaultdict
import random

random.seed(0)


class SumoSimulator:
    def __init__(self, config_file, config, step_length=1.0, gui=False, queue_dist=150):
        self.config_file = config_file
        self.step_length = step_length
        self.gui = gui
        self.queue_detection_distance = queue_dist
        self.priority_weights = config["priority_weights"]

        self._start_simulation()

        # Map SUMO vehicle types to our categories
        self.junctions = self._get_junctions_and_phase_maps()

        # Calculate MAX_ROADS for universal model (padding target)
        if self.junctions:
            self.max_roads = config["system"]["max_roads"]
            print(f"Universal Model: MAX_ROADS = {self.max_roads}")
        else:
            self.max_roads = 4  # Fallback default

        # Track previous state for reward computation
        self.last_weighted_queue = {j_id: 0.0 for j_id in self.junctions}
        self.last_weighted_waiting_times = {j_id: 0.0 for j_id in self.junctions}
        self.phase_timers = {}
        self.current_actions = {}

    def _assign_vehicle_type(self):
        r = random.random()
        if r < 0.70:
            return "car"
        elif r < 0.85:
            return "ambulance"
        elif r < 0.92:
            return "bus"
        elif r < 0.98:
            return "motorcycle"
        else:
            return "ambulance"

    def _get_vehicle_category(self, vtype):
        vtype_lower = vtype.lower()
        if "truck" in vtype_lower or "trailer" in vtype_lower:
            return "ambulance"
        elif "bus" in vtype_lower:
            return "bus"
        elif "motorcycle" in vtype_lower or "bike" in vtype_lower:
            return "motorcycle"
        elif (
            "ambulance" in vtype_lower
            or "emergency" in vtype_lower
            or "truck" in vtype_lower
        ):
            return "ambulance"
        else:
            return "car"

    def _start_simulation(self):
        if "SUMO_HOME" in os.environ:
            tools = os.path.join(os.environ["SUMO_HOME"], "tools")
            sys.path.append(tools)
        else:
            sys.exit("Please declare environment variable 'SUMO_HOME'")

        sumo_binary = "sumo-gui" if self.gui else "sumo"
        sumo_cmd = [
            sumo_binary,
            "-c",
            self.config_file,
            "--step-length",
            str(self.step_length),
            "--no-warnings",
            "true",
            "--time-to-teleport",
            "300",
            "--no-step-log",
            "true",
            "--duration-log.disable",
            "true",
        ]

        traci.start(sumo_cmd)

    def _get_junctions_and_phase_maps(self):
        """
        Discovers junctions and creates action-to-phase mappings.
        Each junction stores its actual number of roads for padding logic.
        """
        junctions = {}
        junction_ids = traci.trafficlight.getIDList()

        for j_id in junction_ids:
            incoming_roads = sorted(
                list(
                    set(
                        [
                            traci.lane.getEdgeID(lane)
                            for lane in set(traci.trafficlight.getControlledLanes(j_id))
                        ]
                    )
                )
            )

            action_to_phase_map = {}

            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                logic = traci.trafficlight.getCompleteRedYellowGreenDefinition(j_id)

                if not logic:
                    continue

                green_phases = {}
                for i, phase in enumerate(logic[0].phases):
                    state = phase.state.lower()

                    # Check for green phases (not yellow and 'g' present)
                    if "y" not in state and "g" in state:
                        green_link_indices = [
                            idx for idx, char in enumerate(state) if char == "g"
                        ]

                        for link_idx in green_link_indices:
                            try:
                                controlled_lanes = (
                                    traci.trafficlight.getControlledLanes(j_id)
                                )
                                incoming_road = traci.lane.getEdgeID(
                                    controlled_lanes[link_idx]
                                )

                                if incoming_road not in green_phases:
                                    green_phases[incoming_road] = i
                            except IndexError:
                                continue

                for action_idx, road_id in enumerate(incoming_roads):
                    if road_id in green_phases:
                        action_to_phase_map[action_idx] = green_phases[road_id]

            junctions[j_id] = {
                "id": j_id,
                "incoming_roads": incoming_roads,
                "num_roads": len(incoming_roads),  # Store actual number
                "action_to_phase": action_to_phase_map,
            }

        return junctions

    def set_phase(self, junction_id, action_index, yellow_time, green_time):
        """
        Set traffic light phase.
        IMPORTANT: action_index here is UNPADDED (0 to num_roads-1)
        """
        junction_info = self.junctions[junction_id]
        actual_num_roads = junction_info["num_roads"]
        # --- FIX: Handle case where action index exceeds actual roads (due to fixed max_roads) ---

        # Ignore padded actions (beyond actual roads)
        if action_index >= actual_num_roads:
            # This is a padded action, do nothing (maintain current phase)
            for _ in range(green_time):
                self.simulation_step()
            return

        if action_index not in junction_info["action_to_phase"]:
            for _ in range(green_time):
                self.simulation_step()
            return

        target_green_phase_index = junction_info["action_to_phase"][action_index]
        traci.trafficlight.setPhase(junction_id, target_green_phase_index)

        for _ in range(green_time):
            self.simulation_step()

    def get_state(self, junction_id):
        """
        Returns PADDED state vector for universal model with PRIORITY WEIGHTS.
        State format: [queue_0, wait_0, queue_1, wait_1, ..., queue_N, wait_N]
        Padded to max_roads with zeros.
        """
        junction_info = self.junctions[junction_id]
        actual_roads = junction_info["incoming_roads"]
        actual_num_roads = junction_info["num_roads"]

        state = []
        processed_roads = junction_info["incoming_roads"][: self.max_roads]
        # Get actual road data
        for road_id in processed_roads:
            lane_count = traci.edge.getLaneNumber(road_id)
            lanes = [f"{road_id}_{i}" for i in range(lane_count)]

            weighted_queue_length = 0.0
            weighted_max_wait_time = 0.0

            for lane_id in lanes:
                vehicles = traci.lane.getLastStepVehicleIDs(lane_id)

                # Calculate weighted queue (stopped vehicles)
                for v_id in vehicles:
                    if traci.vehicle.getSpeed(v_id) < 0.1:
                        sumo_v_type = traci.vehicle.getTypeID(v_id)
                        v_type = self._get_vehicle_category(sumo_v_type)
                        weight = self.priority_weights.get(v_type, 1.0)
                        weighted_queue_length += weight

                # Find maximum weighted waiting time
                for v_id in vehicles:
                    sumo_v_type = traci.vehicle.getTypeID(v_id)
                    v_type = self._get_vehicle_category(sumo_v_type)
                    weight = self.priority_weights.get(v_type, 1.0)
                    vehicle_wait_time = traci.vehicle.getWaitingTime(v_id)
                    weighted_wait = vehicle_wait_time * weight

                    if weighted_wait > weighted_max_wait_time:
                        weighted_max_wait_time = weighted_wait

            # Normalize features
            normalized_queue = min(weighted_queue_length / 20.0, 1.0)
            normalized_wait = min(weighted_max_wait_time / 120.0, 1.0)

            state.extend([normalized_queue, normalized_wait])

        # Calculate exactly how much padding is needed to reach 2 * max_roads
        # Current state length is 2 * len(processed_roads)
        # Target length is 2 * self.max_roads
        padding_needed = (self.max_roads * 2) - len(state)

        if padding_needed > 0:
            state.extend([0.0] * padding_needed)

        return np.array(state, dtype=np.float32)

    def get_reward(self, junction_id):
        """
        Reward calculation with PRIORITY WEIGHTS.
        Only considers ACTUAL roads, ignoring padded ones.
        """
        junction_info = self.junctions[junction_id]
        total_weighted_queue = 0.0
        total_weighted_waiting_time = 0.0
        road_queues = []
        processed_roads = junction_info["incoming_roads"][: self.max_roads]
        for road_id in processed_roads:
            road_queue = 0.0
            road_wait = 0.0
            lanes = [f"{road_id}_{i}" for i in range(traci.edge.getLaneNumber(road_id))]

            for lane_id in lanes:
                for v_id in traci.lane.getLastStepVehicleIDs(lane_id):
                    sumo_v_type = traci.vehicle.getTypeID(v_id)
                    v_type = self._get_vehicle_category(sumo_v_type)
                    weight = self.priority_weights.get(v_type, 1.0)

                    if traci.vehicle.getSpeed(v_id) < 0.1:
                        road_queue += weight

                    road_wait += traci.vehicle.getWaitingTime(v_id) * weight

            total_weighted_queue += road_queue
            total_weighted_waiting_time += road_wait
            road_queues.append(road_queue)

        # Calculate pressure (imbalance between roads)
        pressure = 0.0
        if len(road_queues) > 1:
            avg_queue = np.mean(road_queues)
            pressure = np.std(road_queues) if avg_queue > 0 else 0.0

        reward = -(total_weighted_queue + 0.5 * pressure) / 10.0

        self.last_weighted_queue[junction_id] = total_weighted_queue
        self.last_weighted_waiting_times[junction_id] = total_weighted_waiting_time

        return reward

    def simulation_step(self):
        traci.simulationStep()
        # new_vehicles = traci.simulation.getDepartedIDList()
        # for v_id in new_vehicles:
        #     new_type = self._assign_vehicle_type()
        #     try:
        #         traci.vehicle.setType(v_id, new_type)
        #     except:
        #         pass

    def init_phase_timers(self, junction_ids):
        self.phase_timers = {j_id: 0 for j_id in junction_ids}
        self.current_actions = {j_id: 0 for j_id in junction_ids}

    def update_phase_timers(self):
        for j_id in self.phase_timers:
            self.phase_timers[j_id] += 1

    def close(self):
        traci.close()
