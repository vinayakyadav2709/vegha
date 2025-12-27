# FDRL-Traffic: Federated Deep Reinforcement Learning for Traffic Signal Control

This project implements a sophisticated traffic signal control system using Federated Deep Reinforcement Learning (FDRL). The primary objective is to minimize vehicle waiting times and reduce traffic congestion in complex urban environments. The system is built using Python, PyTorch, and the **Eclipse SUMO (Simulation of Urban MObility)** traffic simulation suite.

The core of this project is a Proximal Policy Optimization (PPO) agent trained in a federated manner. Instead of a single, monolithic agent learning from all traffic data, each traffic junction is managed by its own "client" agent. These clients learn exclusively from their local traffic conditions. A central server periodically aggregates the knowledge (model weights) from all clients to create a robust and generalized global model. This decentralized approach enhances scalability, ensures data privacy, and promotes efficient, distributed training.

## Key Features

*   **Federated Learning:** Enables scalable training across numerous intersections without centralizing sensitive traffic data, enhancing privacy and reducing communication overhead.
*   **Deep Reinforcement Learning:** Utilizes the state-of-the-art Proximal Policy Optimization (PPO) algorithm, an advanced actor-critic method, to learn complex traffic patterns and make intelligent, real-time decisions.
*   **High-Fidelity Simulation:** Built upon **Eclipse SUMO Version 1.24.0**, a microscopic, space-continuous traffic simulator, to model realistic vehicle interactions and network dynamics.
*   **Automated Network Configuration:** Includes a discovery script (`discover_junction.py`) that automatically parses any SUMO map, identifies all controllable traffic light intersections, and populates the configuration file, streamlining the setup process.
*   **Comprehensive Performance Visualization:** Provides both real-time and post-simulation plotting of key performance indicators (KPIs) such as queue length and cumulative waiting time, allowing for immediate and detailed analysis.
*   **Comparative Analysis:** The system is designed to easily benchmark the performance of the trained AI agent against a traditional, non-adaptive fixed-time traffic light controller.

## System Architecture

The project's workflow is logically divided into two main phases: a **Training Phase** to build the intelligent agent, and an **Inference Phase** to deploy and evaluate the agent in a visual simulation.

### Training Phase Architecture

The training process is orchestrated by `train.py`, which launches a central server and multiple client processes—one for each configured traffic junction.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FEDERATED TRAINING WORKFLOW                        │
└─────────────────────────────────────────────────────────────────────────────┘

        Setup       ->      Orchestration       ->         Training Loop
        ═════               ═════════════                  ═════════════

                ┌──────────────┐              ┌──────────┐
                │discover.py   │              │ train.py │
                │              │              │          │
                │ Scans SUMO   │              │ Launches │
                │ Network      │              │ Server & │
                │              │              │ Clients  │
                └──────┬───────┘              └────┬─────┘
                       │                           │
                       │ Writes junction IDs       │
                       │                           │
                       ▼                           ▼
                ┌─────────────┐           ┌────────────────────┐
                │config.yaml  │◀──────────│  Federated Server  │
                │             │  Reads    │ (federated_server) │
                │ - Junctions │           │                    │
                │ - Params    │           │ - Aggregates models│
                └─────────────┘           │ - Coordinates      │
                                          └─────────┬──────────┘
                                                    │
                                    ┌───────────────┼───────────────┐
                                    │               │               │
                                    ▼               ▼               ▼
                            ┌───────────┐   ┌───────────┐   ┌───────────┐
                            │  Client 1 │   │  Client 2 │   │  Client N │
                            │ (Junction │   │ (Junction │   │ (Junction │
                            │     A)    │   │     B)    │   │     Z)    │
                            └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
                                  │               │               │
                                  │   Each client runs independently:
                                  │               │               │
                                  ▼               ▼               ▼
                            ┌───────────────────────────────────────┐
                            │      Local Training Components        │
                            │  ┌─────────────────────────────────┐  │
                            │  │   sumo_simulator.py (Headless)  │  │
                            │  │   - Env interaction             │  │
                            │  │   - State observation           │  │
                            │  │   - Reward calculation          │  │
                            │  └─────────────────────────────────┘  │
                            │  ┌─────────────────────────────────┐  │
                            │  │   ppo_agent.py                  │  │
                            │  │   - Actor-Critic network        │  │
                            │  │   - PPO optimization            │  │
                            │  └─────────────────────────────────┘  │
                            └───────────────────────────────────────┘
                                │               │               │
                                └───────────────┴───────────────┘
                                                │
                                                │ Upload local models
                                                ▼
                                        ┌────────────────────┐
                                        │  Model Aggregation │
                                        │  (FedAvg)          │
                                        └────────┬───────────┘
                                                 │
                                                 │ Broadcast global model
                                                 ▼
                                            Next Training Round
```

### Inference Phase Architecture

The inference process, initiated by `infer.py`, loads the final trained global model to control traffic lights within a SUMO simulation that includes a graphical user interface (GUI) for visualization.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          INFERENCE WORKFLOW                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                        ┌──────────────────────┐
                        │ Trained Model        │
                        │ global_model.pth     │
                        │                      │
                        │ - Actor weights      │
                        │ - Critic weights     │
                        └──────────┬───────────┘
                                   │
                                   │ Loaded by
                                   ▼
                        ┌──────────────────────┐         ┌─────────────────┐
                        │    infer.py          │◀────────│  config.yaml    │
                        │                      │ Reads   │                 │
                        │ - Mode selection     │         │ - Network path  │
                        │   (RL/Fixed)         │         │ - Junctions     │
                        │ - Logging setup      │         └─────────────────┘
                        │ - Visualization      │
                        └──────────┬───────────┘
                                   │
                                   │ Instantiates
                                   ▼
                        ┌──────────────────────┐
                        │   ppo_agent.py       │
                        │                      │
                        │ Actor Network Only   │
                        │ (for action select)  │
                        └──────────┬───────────┘
                                   │
                                   │ Controls signals
                                   ▼
                        ┌──────────────────────────────────────────┐
                        │     sumo_simulator.py (GUI Mode)         │
                        │                                          │
                        │  ┌────────────────────────────────────┐  │
                        │  │  SUMO-GUI Window                   │  │
                        │  │  - Visual traffic simulation       │  │
                        │  │  - Real-time vehicle movement      │  │
                        │  │  - Traffic light states            │  │
                        │  └────────────────────────────────────┘  │
                        │                                          │
                        │  - State observation                     │
                        │  - Action execution                      │
                        │  - Metrics collection                    │
                        └──────────────┬───────────────────────────┘
                                       │
                                       │ Logs metrics
                                       ▼
                        ┌──────────────────────────────────────────┐
                        │     inference_results/                   │
                        │                                          │
                        │  - inference_log_[mode].csv              │
                        │  - final_plot_[mode]_page_[N].png        │
                        │                                          │
                        │  Performance Analysis:                   │
                        │  - Queue lengths over time               │
                        │  - Cumulative waiting times              │
                        │  - Per-junction statistics               │
                        └──────────────────────────────────────────┘
```

## Prerequisites

Before running this project, please ensure your environment meets the following specifications:

### 1. Eclipse SUMO

*   **Version:** `1.24.0` (as confirmed by `sumo --version`). Later versions are likely compatible, but this is the tested version.
*   **Environment Variable:** The `SUMO_HOME` environment variable must be set to the root of your SUMO installation directory.
    ```bash
    # Example for a typical Linux installation
    export SUMO_HOME="/usr/share/sumo"
    ```

### 2. Python

*   **Version:** `3.12` (as specified in the `.python-version` file).

### 3. Python Environment and Dependencies

To ensure a clean and reproducible environment, it is highly recommended to use a virtual environment. We recommend using **`uv`**, a next-generation Python package manager that is extremely fast and serves as a drop-in replacement for `pip` and `venv`.

#### Recommended: Using `uv` (Fastest Method)

`uv` can create a virtual environment and install packages 10-100x faster than `pip`.

1.  **Install `uv`** (if you don't have it already):
    ```bash
    # On macOS and Linux
    curl -LsSf https://astral.sh/uv/install.sh | sh

    # On Windows
    irm https://astral.sh/uv/install.ps1 | iex
    ```
    You can also install it via `pip`: `pip install uv`.

2.  **Create and activate the virtual environment** using `uv`:
    ```bash
    # Create the virtual environment
    uv venv

    # Activate it (macOS/Linux)
    source .venv/bin/activate

    # Activate it (Windows PowerShell)
    .venv\Scripts\Activate.ps1
    ```

3.  **Install the required libraries** using `uv`:
    ```bash
    uv sync # Directly install dependencies if cloned from repository
    # OR Manually install dependencies
    uv add install torch numpy pandas matplotlib ruamel.yaml pyyaml
    ```

#### Alternative: Using standard `pip` and `venv`

If you prefer not to use `uv`, you can follow the traditional approach.

1.  **Create the virtual environment:**
    ```bash
    python3 -m venv .venv
    ```

2.  **Activate it:**
    ```bash
    # On macOS and Linux
    source .venv/bin/activate

    # On Windows PowerShell
    .venv\Scripts\Activate.ps1
    ```

3.  **Install the required libraries** using `pip`:
    ```bash
    pip install torch numpy pandas matplotlib ruamel.yaml pyyaml
    ```

## Step-by-Step Usage Guide

### Step 1: Acquire a SUMO Road Network

This project can operate on any SUMO-compatible road network. The recommended method for generating a network from real-world map data is using the `osmWebWizard.py` tool provided with your SUMO installation.

1.  Open a terminal and navigate to the SUMO tools directory:
    ```bash
    cd $SUMO_HOME/tools
    ```

2.  Launch the OpenStreetMap Web Wizard:
    ```bash
    python osmWebWizard.py
    ```

3.  Your default web browser will open an interface with an interactive map. Select the geographical region you wish to simulate.

4.  Use the options on the left-hand panel to configure vehicle types (e.g., cars, buses) and traffic demand (density).

5.  Click the **"Generate Scenario"** button. The tool will process the map data and generate the necessary SUMO files.

6.  Once complete, a download link will be provided. **Download the generated scenario files and place them into a new subdirectory inside the `sumo_files/` folder of this project.** For example, if you simulated a part of Berlin, you might create `sumo_files/Berlin/`.

### Step 2: Configure the Project for the New Network

1.  **Update Configuration File**: Open `config.yaml` in a text editor. Locate the `sumo.config_file` parameter and update its value to point to the `.sumocfg` file you just downloaded.
    ```yaml
    sumo:
      # Update this path to match your new scenario file
      config_file: sumo_files/Berlin/osm.sumocfg
    ```

2.  **Discover and Register Junctions**: Run the junction discovery script from your terminal. This script will programmatically launch a temporary SUMO instance, find all 4-way intersections with traffic lights, and automatically write their unique IDs into the `system.controlled_junctions` list in `config.yaml`.
    ```bash
    python discover_junction.py
    ```

### Step 3: Train the Federated Reinforcement Learning Model

This is the core training phase where the system learns an optimal traffic control policy. This process is computationally intensive and may take a significant amount of time.

1.  Execute the main training script:
    ```bash
    python train.py
    ```

2.  As the script runs, you should observe:
    *   The main terminal window will display logs from the **federated server**, showing epoch summaries and model aggregation steps.
    *   A Matplotlib window will appear, displaying a **live plot** of the average training rewards and losses, allowing you to monitor the learning progress.

3.  Upon completion (or manual interruption with `Ctrl+C`), the final aggregated global model will be saved to the location specified in `config.yaml`, which defaults to **`./saved_models/global_model.pth`**.

### Step 4: Run Inference and Visualize Performance

With the trained model, you can now run a visual simulation to evaluate its performance.

1.  **Run with the Trained RL Agent**: This command loads your saved `global_model.pth` and launches the SUMO GUI to control the traffic lights.
    ```bash
    python infer.py --mode rl
    ```
    A SUMO window will open showing the simulation, alongside a live performance plot.

2.  **Run the Baseline Fixed-Time Controller**: For comparison, run the simulation with a traditional, non-AI controller that uses a fixed cycle time for traffic lights.
    ```bash
    python infer.py --mode fixed
    ```

### Step 5: Analyze and Interpret the Results

After each inference run concludes, detailed performance artifacts are saved in the `inference_results/` directory:

*   **`inference_log_[mode].csv`**: A CSV file containing a step-by-step log of queue lengths and total waiting times for every controlled junction throughout the simulation.
*   **`final_plot_[mode]_page_[N].png`**: High-quality PNG images that visualize and smooth the performance metrics from the CSV log, providing a clear overview of the agent's effectiveness over the entire run.

## Project File Structure

```
FDRL-Traffic/
├── .gitignore                  # Git ignore file
├── .python-version             # Specifies Python version 3.12
├── README.md                   # This documentation file
├── config.yaml                 # Central configuration for all parameters
├── discover_junction.py        # Script to find and configure traffic junctions
├── federated_client.py         # Implements the logic for a single RL agent
├── federated_server.py         # Manages clients and aggregates models
├── infer.py                    # Main script for visual simulation
├── inference_results/          # Directory for CSV logs and performance plots
│   ├── inference_log_rl.csv
│   ├── inference_log_fixed.csv
│   └── final_plot_*.png
├── ppo_agent.py                # PyTorch Actor/Critic PPO model architecture
├── saved_models/               # Directory for trained global model
│   └── global_model.pth
├── sumo_files/                 # Directory for SUMO network and route files
│   └── [your_scenario]/
│       ├── osm.net.xml
│       ├── osm.rou.xml
│       └── osm.sumocfg
├── sumo_simulator.py           # Python wrapper class for SUMO API (TraCI)
└── train.py                    # Main script to launch federated training
```

## Performance Metrics

The system tracks and visualizes the following key performance indicators:

*   **Queue Length**: Number of vehicles waiting at each junction over time
*   **Total Waiting Time**: Cumulative waiting time across all vehicles
*   **Average Reward**: Training performance metric for the RL agent
*   **Loss**: Actor and critic loss values during training

## Troubleshooting

### Common Issues

1.  **SUMO_HOME not set**: Ensure the environment variable points to your SUMO installation
    ```bash
    echo $SUMO_HOME  # Should print your SUMO path
    ```

2.  **No junctions found**: Verify your SUMO network file contains traffic lights
    ```bash
    python discover_junction.py
    ```

3.  **Training not converging**: Consider adjusting hyperparameters in `config.yaml`:
    *   Learning rate
    *   Batch size
    *   Number of epochs
    *   PPO clip range