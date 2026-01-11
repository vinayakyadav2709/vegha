# FDRL Traffic Signal Control System

This project implements a **Federated Deep Reinforcement Learning (FDRL)** system for controlling traffic signals in complex intersection networks. It uses a **Deep Sets** architecture to handle varying intersection topologies and learns a policy that rivals standard adaptive controllers.

## Key Features
-   **Federated Learning**: Decentralized training across multiple agents with `FedAvg` aggregation.
-   **Deep Sets Architecture**: Permutation-invariant neural network that handles variable numbers of incoming lanes/edges.
-   **Robust Optimization**: Initialized with safety constraints (Max Red Time) and temporal features (Time Since Last Green) to prevent deadlock.
-   **SUMO Integration**: Uses Eclipse SUMO via TraCI for high-fidelity simulation.

## Setup & Installation

### Prerequisites
-   **Docker**: Required to run the SUMO simulation container.
-   **Python 3.10+**: with `uv` for dependency management.

### Installation
1.  **Clone the repository**:
    ```bash
    git clone <repository_url>
    cd FDRL_deep_sets
    ```
2.  **Install dependencies**:
    ```bash
    uv sync
    ```
3.  **Generate Simulation Environment**:
    Run the setup script to create the necessary SUMO network files (`complex.net.xml`, etc.).
    ```bash
    uv run setup_complex_environment.py
    ```

## Usage

### 1. Training the FDRL Agent
Train the global model from scratch (or continue training).
```bash
uv run main.py --mode train --episodes 15 --no-gui
```
*   Aggregates weights every 500 steps.
*   Saves models to `global_model.pth`.

### 2. Testing the Trained Model
Run the simulation using the trained weights (No exploration).
```bash
uv run main.py --mode test --load global_model.pth --no-gui
```

### 3. Running Baselines
Compare against standard traffic control methods.
```bash
# Actuated (Sensor-based adaptive)
uv run main.py --mode actuated --no-gui

# Fixed-Time (Static Cycle)
uv run main.py --mode fixed_time --no-gui
```

## Benchmark Results

We compared the **Optimized FDRL Agent** against standard baselines on a complex 7-intersection network.

| Metric | Fixed-Time | Actuated (Baseline) | FDRL (Optimized) |
| :--- | :--- | :--- | :--- |
| **Peak Total Queue** | 149 vehicles | **29 vehicles** | ~37 vehicles |
| **Peak Total Wait** | ~8,737 s | **~444 s** | ~608 s |
| **Avg Speed** | 13.4 m/s | 13.8 m/s | 13.8 m/s |
| **Status** | Congested | Optimal | **Near-Optimal** |

### Analysis
*   **Actuated**: Remains the gold standard for simple isolated logic, achieving the lowest queues.
*   **FDRL (Optimized)**: Achieved near-parity with the actuated controller. By increasing the Minimum Green Time to 10s and incorporating a Speed Reward, the RL agent learned to minimize switching overhead and maintain continuous flow, completely eliminating the gridlock issues seen in earlier versions.
*   **Fixed-Time**: Performed significantly worse, unable to adapt to dynamic traffic loads.

## Project Structure
-   `main.py`: Entry point for simulation and training loop.
-   `junction.py`: Agent logic (FDRL, Actuated, FixedTime).
-   `models.py`: PyTorch Deep Sets network definition.
-   `fdrl_server.py`: Federated Learning server for weight aggregation.
-   `setup_complex_environment.py`: Script to generate SUMO network files.
-   `utils.py`: Helper functions for rewards, state features, and SUMO interfacing.
