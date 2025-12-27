import torch
import torch.nn as nn
import torch.optim as optim
from torch.distributions import Categorical
import numpy as np
from lightning.fabric import Fabric

class Actor(nn.Module):
    def __init__(self, state_dim, action_dim, hidden_layers):
        super(Actor, self).__init__()
        layers = []
        input_dim = state_dim
        for hidden_dim in hidden_layers:
            layers.append(nn.Linear(input_dim, hidden_dim))
            layers.append(nn.ReLU())
            input_dim = hidden_dim
        layers.append(nn.Linear(input_dim, action_dim))
        layers.append(nn.Softmax(dim=-1))
        self.net = nn.Sequential(*layers)

    def forward(self, state):
        return self.net(state)

class Critic(nn.Module):
    def __init__(self, state_dim, hidden_layers):
        super(Critic, self).__init__()
        layers = []
        input_dim = state_dim
        for hidden_dim in hidden_layers:
            layers.append(nn.Linear(input_dim, hidden_dim))
            layers.append(nn.ReLU())
            input_dim = hidden_dim
        layers.append(nn.Linear(input_dim, 1))
        self.net = nn.Sequential(*layers)

    def forward(self, state):
        return self.net(state)

class PPOAgent:
    def __init__(self, state_dim, action_dim, config, fabric=None):
        self.config = config
        self.fabric = fabric
        self.state_dim = state_dim
        self.action_dim = action_dim

        hidden_layers = config['model']['hidden_layers']
        
        # Create models
        self.actor = Actor(state_dim, action_dim, hidden_layers)
        self.critic = Critic(state_dim, hidden_layers)
        self.actor_old = Actor(state_dim, action_dim, hidden_layers)
        self.actor_old.load_state_dict(self.actor.state_dict())

        # Create optimizers
        self.optimizer_actor = optim.Adam(self.actor.parameters(), lr=config['fdrl']['actor_lr'])
        self.optimizer_critic = optim.Adam(self.critic.parameters(), lr=config['fdrl']['critic_lr'])

        # Setup with Fabric if provided
        if self.fabric:
            self.actor = self.fabric.setup(self.actor)
            self.critic = self.fabric.setup(self.critic)
            self.actor_old = self.fabric.setup(self.actor_old)
            self.optimizer_actor = self.fabric.setup_optimizers(self.optimizer_actor)
            self.optimizer_critic = self.fabric.setup_optimizers(self.optimizer_critic)

        self.mse_loss = nn.MSELoss()

    def select_action(self, state):
        with torch.no_grad():
            if self.fabric:
                state_tensor = torch.FloatTensor(state).to(self.fabric.device)
            else:
                state_tensor = torch.FloatTensor(state)
            action_probs = self.actor_old(state_tensor)
            dist = Categorical(action_probs)
            action = dist.sample()
            action_log_prob = dist.log_prob(action)
            return action.item(), action_log_prob.item()

    def update(self, memory):
        # Monte Carlo estimate of rewards
        rewards = []
        discounted_reward = 0
        for reward, done in zip(reversed(memory.rewards), reversed(memory.is_terminals)):
            if done:
                discounted_reward = 0
            discounted_reward = reward + (self.config['fdrl']['gamma'] * discounted_reward)
            rewards.insert(0, discounted_reward)

        if self.fabric:
            rewards = torch.tensor(rewards, dtype=torch.float32).to(self.fabric.device)
        else:
            rewards = torch.tensor(rewards, dtype=torch.float32)
        rewards = (rewards - rewards.mean()) / (rewards.std() + 1e-7)

        # Convert to tensors
        if self.fabric:
            old_states = torch.tensor(np.array(memory.states), dtype=torch.float32).to(self.fabric.device)
            old_actions = torch.tensor(memory.actions, dtype=torch.int64).to(self.fabric.device)
            old_logprobs = torch.tensor(memory.logprobs, dtype=torch.float32).to(self.fabric.device)
        else:
            old_states = torch.tensor(np.array(memory.states), dtype=torch.float32)
            old_actions = torch.tensor(memory.actions, dtype=torch.int64)
            old_logprobs = torch.tensor(memory.logprobs, dtype=torch.float32)

        # Optimize policy for K epochs
        for _ in range(self.config['fdrl']['K']):
            logprobs, state_values, dist_entropy = self.evaluate(old_states, old_actions)
            ratios = torch.exp(logprobs - old_logprobs.detach())
            advantages = rewards - state_values.detach()
            surr1 = ratios * advantages
            surr2 = torch.clamp(ratios, 1-self.config['fdrl']['clip_epsilon'], 1+self.config['fdrl']['clip_epsilon']) * advantages
            
            actor_loss = -torch.min(surr1, surr2).mean()
            critic_loss = self.mse_loss(state_values, rewards)
            loss = actor_loss + 0.5 * critic_loss - 0.01 * dist_entropy

            # Backward pass
            self.optimizer_actor.zero_grad()
            self.optimizer_critic.zero_grad()
            
            if self.fabric:
                self.fabric.backward(loss.mean())
            else:
                loss.mean().backward()
                
            self.optimizer_actor.step()
            self.optimizer_critic.step()

        # Copy new weights into old policy
        self.actor_old.load_state_dict(self.actor.state_dict())

        return loss.mean().item(), actor_loss.mean().item(), critic_loss.mean().item()

    def evaluate(self, state, action):
        action_probs = self.actor(state)
        dist = Categorical(action_probs)
        action_logprobs = dist.log_prob(action)
        dist_entropy = dist.entropy()
        state_values = self.critic(state)
        return action_logprobs, torch.squeeze(state_values), dist_entropy

class Memory:
    def __init__(self):
        self.actions = []
        self.states = []
        self.logprobs = []
        self.rewards = []
        self.is_terminals = []

    def clear_memory(self):
        del self.actions[:]
        del self.states[:]
        del self.logprobs[:]
        del self.rewards[:]
        del self.is_terminals[:]
