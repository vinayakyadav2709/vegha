import traci
import utils
from models import DQN_Agent


class JunctionAgent:
    """Controls a single intersection using FDRL + Deep Sets."""

    def __init__(self, tls_id, shared_model_state=None):
        self.tls_id = tls_id

        # Topology Discovery
        self.edge_lane_map = utils.get_controlled_lanes(tls_id)
        self.unique_edges = sorted(list(self.edge_lane_map.keys()))
        self.all_lanes = [
            lane for lanes in self.edge_lane_map.values() for lane in lanes
        ]
        
        # Subscribe to lane variables for optimization
        utils.subscribe_lanes(self.all_lanes)

        # Pre-compute Green States (O(1) lookup)
        self.edge_to_green_state = self._precompute_states() # key -> edge, val -> phase state for the key edge green (allowing all vehicles to pass from key edge)

        # AI Brain
        self.brain = DQN_Agent()
        if shared_model_state:
            self.brain.set_weights(shared_model_state)

        self.normalizer = utils.Normalizer()

        # State Tracking
        self.current_edge_idx = 0
        self.current_state_str = ""
        self.is_yellow = False
        self.yellow_steps_left = 0
        self.last_switch_time = 0
        self.last_decision_time = 0
        self.last_green_times = {edge: 0.0 for edge in self.unique_edges}

        # Experience Storage
        self.last_observation = None
        
        # Training Optimization
        self.step_counter = 0
        self.train_frequency = 10

        # Initialize
        if self.unique_edges:
            first_edge = self.unique_edges[0]
            self.current_state_str = self.edge_to_green_state[first_edge]
            try:
                traci.trafficlight.setRedYellowGreenState(
                    self.tls_id, self.current_state_str
                )
            except traci.exceptions.TraCIException as e:
                print(f"[{self.tls_id}] Warning: Could not set initial state: {e}")

    def _precompute_states(self):
        """Generates Green Phase string for each edge."""
        mapping = {}
        links = traci.trafficlight.getControlledLinks(self.tls_id) # list of [incomin_lane, outgoing_lane, via_lane]

        index_to_edge = []
        for link in links:
            if link:
                edge = traci.lane.getEdgeID(link[0][0])
                index_to_edge.append(edge)
            else:
                index_to_edge.append(None)

        for target_edge in self.unique_edges:
            s = ""
            for map_edge in index_to_edge: # map_edge is basically incoming edge 
                if map_edge == target_edge:
                    s += "G"
                else:
                    s += "r"
            mapping[target_edge] = s

        return mapping

    def _build_yellow(self, state_str):
        """Converts G/g to y for yellow phase."""
        return "".join(["y" if c in ["G", "g", "y"] else "r" for c in state_str])


    def step(self, current_sim_time, train=True):
        """Called every simulation step."""
        if not self.unique_edges:
            return
            
        self.step_counter += 1

        # Yellow Phase (Blocking)
        if self.is_yellow:
            self.yellow_steps_left -= 1
            if self.yellow_steps_left <= 0:
                self.is_yellow = False
                target_edge = self.unique_edges[self.current_edge_idx]
                new_state = self.edge_to_green_state[target_edge]
                self.last_green_times[target_edge] = current_sim_time

                try:
                    traci.trafficlight.setRedYellowGreenState(self.tls_id, new_state)
                    self.current_state_str = new_state
                    self.last_switch_time = current_sim_time
                except traci.exceptions.TraCIException as e:
                    print(f"[{self.tls_id}] Error setting state: {e}")
            return

        # AI Decision (Min 10s Green, then check every 2s)
        time_in_phase = current_sim_time - self.last_switch_time
        if time_in_phase < 10.0:
            return
            
        # Continuous Control: Check only every 1.0s after min green
        if current_sim_time - self.last_decision_time < 1.0:
            return
        self.last_decision_time = current_sim_time

        # 1. Gather Current State
        context_feats = utils.get_aggregated_features(self.all_lanes, self.normalizer)

        candidate_feats = []
        for edge in self.unique_edges:
            lanes = self.edge_lane_map[edge]
            feats = utils.get_aggregated_features(lanes, self.normalizer)
            
            # Feature: Time Since Last Green (Normalized 1 = 100s)
            tslg = (current_sim_time - self.last_green_times[edge]) / 100.0
            feats.append(tslg)

            # Feature: Is Currently Green? (Explicit State)
            is_green = 1.0 if edge == self.unique_edges[self.current_edge_idx] else 0.0
            feats.append(is_green)
            
            candidate_feats.append(feats)

        # 2. Get Reward for PREVIOUS action
        current_reward = utils.compute_reward(self.all_lanes, self.normalizer)
        
        # Apply switching penalty to the reward for the *previous* action
        if hasattr(self, 'last_action_caused_switch') and self.last_action_caused_switch:
             current_reward -= 0.10  # Penalty for switching (tunable)

        # 3. Store Experience (S, A, R, S')
        if self.last_observation and train:
            last_cands, last_ctx, last_act = self.last_observation
            self.brain.store_transition(
                (
                    last_cands,
                    last_ctx,
                    last_act,
                    current_reward,
                    candidate_feats,
                    context_feats,
                    False,
                )
            )
            
            # OPTIMIZATION: Train only every N steps
            if self.step_counter % self.train_frequency == 0:
                self.brain.train_step()

        # 4. Select Action
        action_idx = self.brain.predict(candidate_feats, context_feats, explore=train)

        # SAFETY: FORCE SWITCH if stuck too long (Max Red Starvation)
        MAX_RED_TIME = 120.0
        for i, edge in enumerate(self.unique_edges):
            if current_sim_time - self.last_green_times[edge] > MAX_RED_TIME:
                 if i != self.current_edge_idx: # Only force if it's not currently green (which would be weird if red time is high)
                     action_idx = i
                     if self.step_counter % 100 == 0:
                         print(f"[{self.tls_id}] MAX RED EXCEEDED on {edge}. Forcing switch.")
                     break

        # FORCE SWITCH if stuck too long (Max Green Safety)
        MAX_GREEN_TIME = 100.0
        time_current_green = current_sim_time - self.last_switch_time
        if time_current_green > MAX_GREEN_TIME and action_idx == self.current_edge_idx:
            action_idx = (self.current_edge_idx + 1) % len(self.unique_edges)
            print(f"[{self.tls_id}] MAX GREEN EXCEEDED. Forcing switch to {self.unique_edges[action_idx]}")

        # 5. Update Observation
        self.last_observation = (candidate_feats, context_feats, action_idx)

        # 6. Execute Action
        self.last_action_caused_switch = False
        if action_idx != self.current_edge_idx:
            # Switch needed
            yellow_state = self._build_yellow(self.current_state_str)
            try:
                traci.trafficlight.setRedYellowGreenState(self.tls_id, yellow_state)
                self.is_yellow = True
                self.yellow_steps_left = 3
                self.current_edge_idx = action_idx
                self.last_action_caused_switch = True
            except traci.exceptions.TraCIException as e:
                print(f"[{self.tls_id}] Error setting yellow: {e}")
        else:
            # Keep current
            self.last_switch_time = current_sim_time

    def reset(self):
        """Reset agent state for new episode."""
        self.current_edge_idx = 0
        self.is_yellow = False
        self.yellow_steps_left = 0
        self.last_switch_time = 0
        self.last_decision_time = 0
        self.last_observation = None
        self.last_action_caused_switch = False

        if self.unique_edges:
            first_edge = self.unique_edges[0]
            self.current_state_str = self.edge_to_green_state[first_edge]
            try:
                traci.trafficlight.setRedYellowGreenState(
                    self.tls_id, self.current_state_str
                )
            except:
                pass

    def get_weights(self):
        return self.brain.get_weights()

    def update_weights(self, global_weights, alpha=0.5):
        """
        Soft update from Global Model.
        alpha: How much to keep LOCAL weights (0 = full global, 1 = full local)
        """
        local_weights = self.brain.get_weights()
        new_weights = {}

        for key in local_weights:
            new_weights[key] = (
                alpha * local_weights[key] + (1 - alpha) * global_weights[key]
            )

        self.brain.set_weights(new_weights)


class ActuatedAgent:
    """
    Delegates control to SUMO's 'actuated' controller.
    Requires .net.xml to have tls.default-type="actuated".
    """
    def __init__(self, tls_id):
        self.tls_id = tls_id
        self.edge_lane_map = utils.get_controlled_lanes(tls_id)
        self.all_lanes = [
            lane for lanes in self.edge_lane_map.values() for lane in lanes
        ]
        
        # Subscribe to lane variables for optimization
        utils.subscribe_lanes(self.all_lanes)


    def step(self, current_sim_time, train=False):
        pass
        
    def get_weights(self):
        return {}

    def update_weights(self, global_weights, alpha=0.5):
        pass

    def reset(self):
        pass


class FixedTimeAgent:
    """
    Delegates control to SUMO's static '0' program.
    """
    def __init__(self, tls_id):
        self.tls_id = tls_id
        self.edge_lane_map = utils.get_controlled_lanes(tls_id)
        self.all_lanes = [
            lane for lanes in self.edge_lane_map.values() for lane in lanes
        ]
        
        # Subscribe to lane variables for optimization
        utils.subscribe_lanes(self.all_lanes)
        try:
             traci.trafficlight.setProgram(tls_id, "0") 
        except:
             pass 

    def step(self, current_sim_time, train=False):
        pass
        
    def get_weights(self):
        return {}

    def update_weights(self, global_weights, alpha=0.5):
        pass

    def reset(self):
        try:
             traci.trafficlight.setProgram(self.tls_id, "0") 
        except:
             pass
