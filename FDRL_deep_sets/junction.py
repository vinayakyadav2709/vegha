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

        # Pre-compute Green States (O(1) lookup)
        self.edge_to_green_state = self._precompute_states()

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

        # Experience Storage
        self.last_observation = None

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
        links = traci.trafficlight.getControlledLinks(self.tls_id)

        index_to_edge = []
        for link in links:
            if link:
                edge = traci.lane.getEdgeID(link[0][0])
                index_to_edge.append(edge)
            else:
                index_to_edge.append(None)

        for target_edge in self.unique_edges:
            s = ""
            for map_edge in index_to_edge:
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

        # Yellow Phase (Blocking)
        if self.is_yellow:
            self.yellow_steps_left -= 1
            if self.yellow_steps_left <= 0:
                self.is_yellow = False
                target_edge = self.unique_edges[self.current_edge_idx]
                new_state = self.edge_to_green_state[target_edge]

                try:
                    traci.trafficlight.setRedYellowGreenState(self.tls_id, new_state)
                    self.current_state_str = new_state
                    self.last_switch_time = current_sim_time
                except traci.exceptions.TraCIException as e:
                    print(f"[{self.tls_id}] Error setting state: {e}")
            return

        # AI Decision (Min 5s between decisions)
        time_in_phase = current_sim_time - self.last_switch_time
        if time_in_phase < 5.0:
            return

        # 1. Gather Current State
        context_feats = utils.get_aggregated_features(self.all_lanes, self.normalizer)

        candidate_feats = []
        for edge in self.unique_edges:
            lanes = self.edge_lane_map[edge]
            feats = utils.get_aggregated_features(lanes, self.normalizer)
            candidate_feats.append(feats)

        # 2. Get Reward for PREVIOUS action
        current_reward = utils.compute_reward(self.all_lanes, self.normalizer)

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
            self.brain.train_step()

        # 4. Select Action
        action_idx = self.brain.predict(candidate_feats, context_feats, explore=train)

        # 5. Update Observation
        self.last_observation = (candidate_feats, context_feats, action_idx)

        # 6. Execute Action
        if action_idx != self.current_edge_idx:
            # Switch needed
            yellow_state = self._build_yellow(self.current_state_str)
            try:
                traci.trafficlight.setRedYellowGreenState(self.tls_id, yellow_state)
                self.is_yellow = True
                self.yellow_steps_left = 3
                self.current_edge_idx = action_idx
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
        self.last_observation = None

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
