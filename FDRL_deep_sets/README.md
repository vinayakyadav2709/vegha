***

# Federated Reinforcement Learning (FDRL) Traffic Management System

A scalable, decentralized traffic signal control system using **Federated Deep Reinforcement Learning (FDRL)** and **SUMO (Simulation of Urban MObility)**. This system is designed to handle intersections with varying topologies (3-way, 4-way, 5-way) without requiring input padding or graph neural networks, making it highly efficient and lightweight.

## 🚀 Key Features

*   **Federated Learning (FDRL):** Agents learn locally at each intersection and periodically aggregate knowledge via a central server using a **FedProx-inspired** algorithm with outlier detection.
*   **Topology Invariant Architecture:** Uses a **Candidate Scoring Q-Network**. One single model architecture works for *any* intersection geometry (3-way, 4-way, N-way). No zero-padding required.
*   **Dockerized Simulation:** Runs the SUMO simulation entirely inside a Docker container, keeping your local environment clean.
*   **Robust Pre-processing:** Handles variable numbers of lanes per road automatically.
*   **Hybrid Training Modes:** Supports online learning from scratch or deploying pre-trained global models.

---

## 🛠️ Architecture

### 1. The Invariant Q-Network (The Brain)
Unlike traditional RL approaches that output a fixed vector (e.g., `[North, South, East, West]`), our agents use a **Permutation Invariant** scoring approach:
*   **Input:** `[Target_Edge_Features, Global_Context_Mean]`
*   **Output:** `Scalar Q-Value` (Score)
*   **Logic:** The model runs $N$ times for an $N$-way intersection. It asks: *"Given the global traffic context, how good is it to make Edge X green?"* The edge with the highest score wins.

### 2. Federated Aggregation
*   **Algorithm:** Statistical Weighted Averaging.
*   **Outlier Detection:** The server calculates the Mean and Standard Deviation ($\sigma$) of incoming weights. Agents deviating $> 1.5\sigma$ from the group are down-weighted (factor 0.5) to prevent corrupted data from ruining the global model.
*   **Soft Updates:** Agents do not blindly overwrite their local knowledge. They perform a soft update: $\theta_{local} = \alpha \theta_{global} + (1-\alpha) \theta_{local}$.

---

## 📦 Installation

### Prerequisites
1.  **Docker:** Ensure Docker is installed and running.
    *   *Linux:* `sudo usermod -aG docker $USER` (Log out and back in).
2.  **Python 3.8+**
3.  **Python Dependencies:**
    ```bash
    pip install torch numpy traci
    ```

### Project Structure
```text
.
├── complex_env_setup.py   # Generates the complex map (Netconvert/RandomTrips)
├── main.py                # Orchestrator: Runs simulation, agents, and FL Server
├── junction.py            # Local Agent Logic (RL, State Machine, Training)
├── models.py              # PyTorch Neural Network Definitions
├── fdrl_server.py         # Federated Aggregation Logic
├── utils.py               # Docker helpers, Normalization, & TraCI wrappers
└── README.md              # This file
```

---

## 🚦 Usage

### 1. Generate the Map
First, generate the complex network topology (Star-Mesh with 3/4/5-way intersections) and traffic routes.
```bash
python complex_env_setup.py
```
*This creates `complex.net.xml`, `complex.rou.xml`, and `complex.sumocfg` in `~/sumo-projs/`.*

### 2. Train from Scratch (Online Learning)
Start the simulation with random weights. Agents will learn by trial and error, aggregating knowledge every 500 steps.
```bash
python main.py --mode scratch
```

### 3. Run with Pre-trained Model
After training, a `global_model.pth` is saved. Use this to start the next simulation with "smart" agents.
```bash
python main.py --mode pretrained
```

---

## 🧠 Technical Details

### State Space
For every incoming edge, we collect aggregated features from all its lanes:
1.  **Queue Length:** Normalized by 50 vehicles.
2.  **Waiting Time:** Normalized by 300 seconds.
3.  **Avg Speed:** Normalized by 20 m/s.
4.  **Traffic Volume:** Normalized by 10 vehicles.
5.  **Occupancy:** % of road covered.

### Reward Function
$$ R_t = - \frac{\sum_{l \in Lanes} WaitingTime_l}{100} $$
*Goal:* Minimize the total accumulated waiting time of all vehicles at the junction.

### Traffic Signal Logic
*   **Green:** The agent selects the edge with the highest Q-Score.
*   **Yellow:** If the selected edge $\neq$ current edge, a dynamic Yellow phase is constructed (turning current Greens to Yellow) and held for 3 seconds.
*   **Red:** All non-active edges are held at Red.

---

## 🐛 Troubleshooting

**"Connection Refused" / Docker Errors:**
*   Ensure Docker is running (`docker ps`).
*   If on Linux, ensure you added your user to the docker group so you don't need `sudo`.

**"TraCI connection failed":**
*   The script waits 3 seconds for SUMO to start. If your PC is slow, increase the `time.sleep(3)` in `utils.py`.

**"Teleporting Vehicles":**
*   This is handled in the config (`time-to-teleport="-1"`). If vehicles act weirdly, check if the map was generated correctly with `complex_env_setup.py`.

---

## 📜 License
This project uses [Eclipse SUMO](https://eclipse.dev/sumo/), which is licensed under EPL 2.0. The code provided here is for educational and research purposes.
