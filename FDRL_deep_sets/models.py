import torch
import torch.nn as nn
import torch.optim as optim
import numpy as np
import random
import copy


class TrafficSignalScorer(nn.Module):
    """
    Deep Sets Invariant Q-Network.
    Takes ONE candidate edge + GLOBAL context, outputs scalar Q-value.
    """

    def __init__(self, input_dim=10):
        super(TrafficSignalScorer, self).__init__()
        self.network = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
        )

    def forward(self, candidate_features, context_features):
        combined = torch.cat([candidate_features, context_features], dim=1)
        score = self.network(combined)
        return score


class DQN_Agent:
    """Handles training with Replay Buffer and Target Network."""

    def __init__(self, learning_rate=0.001, gamma=0.95, buffer_size=5000):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        self.model = TrafficSignalScorer().to(self.device)
        self.target_model = copy.deepcopy(self.model)
        self.target_model.eval()

        self.optimizer = optim.Adam(self.model.parameters(), lr=learning_rate)
        self.loss_fn = nn.MSELoss()

        self.gamma = gamma
        self.replay_buffer = []
        self.buffer_capacity = buffer_size
        self.batch_size = 32

        # Epsilon-Greedy
        self.epsilon = 1.0
        self.epsilon_min = 0.1
        self.epsilon_decay = 0.995

        # Target network update
        self.train_steps = 0
        self.target_update_freq = 100

    def predict(self, candidate_list, context_vector, explore=True):
        """
        Selects action using epsilon-greedy.
        Returns: Index of best edge
        """
        # Exploration
        if explore and random.random() < self.epsilon:
            return random.randint(0, len(candidate_list) - 1)

        # Exploitation
        self.model.eval()
        scores = []
        context_tensor = torch.FloatTensor(context_vector).unsqueeze(0).to(self.device)

        with torch.no_grad():
            for feats in candidate_list:
                cand_tensor = torch.FloatTensor(feats).unsqueeze(0).to(self.device)
                score = self.model(cand_tensor, context_tensor)
                scores.append(score.item())

        return np.argmax(scores)

    def store_transition(self, transition):
        if len(self.replay_buffer) >= self.buffer_capacity:
            self.replay_buffer.pop(0)
        self.replay_buffer.append(transition)

    def train_step(self):
        """Performs batched backpropagation."""
        if len(self.replay_buffer) < self.batch_size:
            return 0.0

        batch = random.sample(self.replay_buffer, self.batch_size)

        self.model.train()
        self.optimizer.zero_grad()

        batch_loss = []

        for cands, ctx, action_idx, reward, next_cands, next_ctx, done in batch:
            # Current Q-value
            cand_tensor = (
                torch.FloatTensor(cands[action_idx]).unsqueeze(0).to(self.device)
            )
            ctx_tensor = torch.FloatTensor(ctx).unsqueeze(0).to(self.device)
            current_q = self.model(cand_tensor, ctx_tensor)

            # Target Q-value
            with torch.no_grad():
                if done:
                    target_q = reward
                else:
                    next_ctx_t = (
                        torch.FloatTensor(next_ctx).unsqueeze(0).to(self.device)
                    )
                    next_scores = []
                    for nc in next_cands:
                        nc_t = torch.FloatTensor(nc).unsqueeze(0).to(self.device)
                        next_scores.append(self.target_model(nc_t, next_ctx_t).item())
                    max_next_q = max(next_scores) if next_scores else 0
                    target_q = reward + self.gamma * max_next_q

            target_tensor = torch.tensor([target_q], dtype=torch.float32).to(
                self.device
            )
            loss = self.loss_fn(current_q, target_tensor)
            batch_loss.append(loss)

        # Average loss across batch
        total_loss = torch.stack(batch_loss).mean()
        total_loss.backward()
        torch.nn.utils.clip_grad_norm_(self.model.parameters(), 1.0)
        self.optimizer.step()

        # Update target network periodically
        self.train_steps += 1
        if self.train_steps % self.target_update_freq == 0:
            self.update_target_network()

        # Decay epsilon
        if self.epsilon > self.epsilon_min:
            self.epsilon *= self.epsilon_decay

        return total_loss.item()

    def update_target_network(self):
        self.target_model.load_state_dict(self.model.state_dict())

    def get_weights(self):
        return self.model.state_dict()

    def set_weights(self, new_state_dict):
        self.model.load_state_dict(new_state_dict)
