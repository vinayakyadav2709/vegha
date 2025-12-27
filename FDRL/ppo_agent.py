"""
PPO Agent with Actor-Critic Architecture
Supports both standalone and Lightning Fabric training
"""

import torch
import torch.nn as nn
from torch.distributions import Categorical
import numpy as np

torch.set_float32_matmul_precision("medium")


class Memory:
    def __init__(self):
        self.states = []
        self.actions = []
        self.logprobs = []
        self.rewards = []
        self.is_terminals = []

    def clear_memory(self):
        del self.states[:]
        del self.actions[:]
        del self.logprobs[:]
        del self.rewards[:]
        del self.is_terminals[:]


class Actor(nn.Module):
    def __init__(self, state_dim, action_dim, config):
        super(Actor, self).__init__()

        # Get hidden layers from config
        hidden_layers = config["model"]["hidden_layers"]
        activation = config["model"]["activation"]

        layers = []
        input_dim = state_dim

        for hidden_dim in hidden_layers:
            layers.append(nn.Linear(input_dim, hidden_dim))
            if activation == "relu":
                layers.append(nn.ReLU())
            elif activation == "tanh":
                layers.append(nn.Tanh())
            input_dim = hidden_dim

        layers.append(nn.Linear(input_dim, action_dim))
        layers.append(nn.Softmax(dim=-1))

        self.network = nn.Sequential(*layers)

    def forward(self, state):
        return self.network(state)


class Critic(nn.Module):
    def __init__(self, state_dim, config):
        super(Critic, self).__init__()

        hidden_layers = config["model"]["hidden_layers"]
        activation = config["model"]["activation"]

        layers = []
        input_dim = state_dim

        for hidden_dim in hidden_layers:
            layers.append(nn.Linear(input_dim, hidden_dim))
            if activation == "relu":
                layers.append(nn.ReLU())
            elif activation == "tanh":
                layers.append(nn.Tanh())
            input_dim = hidden_dim

        layers.append(nn.Linear(input_dim, 1))

        self.network = nn.Sequential(*layers)

    def forward(self, state):
        return self.network(state)


class PPOAgent:
    def __init__(self, state_dim, action_dim, config, fabric=None):
        self.fabric = fabric
        self.gamma = config["fdrl"]["gamma"]
        self.eps_clip = config["fdrl"]["clip_epsilon"]
        self.K_epochs = 4

        self.actor = Actor(state_dim, action_dim, config)
        self.critic = Critic(state_dim, config)
        self.actor_old = Actor(state_dim, action_dim, config)
        self.actor_old.load_state_dict(self.actor.state_dict())

        self.actor_optimizer = torch.optim.Adam(
            self.actor.parameters(), lr=config["fdrl"]["actor_lr"]
        )
        self.critic_optimizer = torch.optim.Adam(
            self.critic.parameters(), lr=config["fdrl"]["critic_lr"]
        )

        self.MseLoss = nn.MSELoss()

        # Setup with Fabric if provided
        if self.fabric:
            self.actor, self.actor_optimizer = self.fabric.setup(
                self.actor, self.actor_optimizer
            )
            self.critic, self.critic_optimizer = self.fabric.setup(
                self.critic, self.critic_optimizer
            )
            self.actor_old = self.fabric.setup_module(self.actor_old)

    def update(self, memory):
        # Convert to tensors
        old_states = torch.FloatTensor(np.array(memory.states))
        old_actions = torch.LongTensor(memory.actions)
        old_logprobs = torch.FloatTensor(memory.logprobs)

        if self.fabric:
            old_states = old_states.to(self.fabric.device)
            old_actions = old_actions.to(self.fabric.device)
            old_logprobs = old_logprobs.to(self.fabric.device)

        # Calculate rewards-to-go
        rewards = []
        discounted_reward = 0
        for reward, is_terminal in zip(
            reversed(memory.rewards), reversed(memory.is_terminals)
        ):
            if is_terminal:
                discounted_reward = 0
            discounted_reward = reward + (self.gamma * discounted_reward)
            rewards.insert(0, discounted_reward)

        rewards = torch.FloatTensor(rewards)
        if self.fabric:
            rewards = rewards.to(self.fabric.device)

        # Normalize rewards
        rewards = (rewards - rewards.mean()) / (rewards.std() + 1e-7)

        total_loss = 0
        total_actor_loss = 0
        total_critic_loss = 0

        # Optimize for K epochs
        for _ in range(self.K_epochs):
            # Evaluate old actions
            action_probs = self.actor(old_states)
            dist = Categorical(action_probs)
            action_logprobs = dist.log_prob(old_actions)
            state_values = self.critic(old_states).squeeze()

            # Calculate ratio and surrogate loss
            ratios = torch.exp(action_logprobs - old_logprobs.detach())
            advantages = rewards - state_values.detach()

            surr1 = ratios * advantages
            surr2 = (
                torch.clamp(ratios, 1 - self.eps_clip, 1 + self.eps_clip) * advantages
            )

            actor_loss = -torch.min(surr1, surr2).mean()
            critic_loss = self.MseLoss(state_values, rewards)
            loss = actor_loss + 0.5 * critic_loss

            # Backprop
            self.actor_optimizer.zero_grad()
            self.critic_optimizer.zero_grad()

            if self.fabric:
                self.fabric.backward(loss)
            else:
                loss.backward()

            self.actor_optimizer.step()
            self.critic_optimizer.step()

            total_loss += loss.item()
            total_actor_loss += actor_loss.item()
            total_critic_loss += critic_loss.item()

        # Update old policy
        self.actor_old.load_state_dict(self.actor.state_dict())

        return (
            total_loss / self.K_epochs,
            total_actor_loss / self.K_epochs,
            total_critic_loss / self.K_epochs,
        )
