import yaml
import traci
import os
import sys

# 1. Load Config
with open("config.yaml", "r") as f:
    config = yaml.safe_load(f)

# 2. Start SUMO (Headless)
if "SUMO_HOME" in os.environ:
    sys.path.append(os.path.join(os.environ["SUMO_HOME"], "tools"))

# We use the config file, which might load your RL logic too.
# But we will specifically ask for Program "0" (the default/actuated one).
cmd = ["sumo", "-c", config["sumo"]["config_file"], "--no-warnings"]
traci.start(cmd)

junctions = config["system"]["controlled_junctions"]
print(f"Inspecting {len(junctions)} junctions...\n")

for jid in junctions:
    print(f"--- Junction: {jid} ---")

    # Force switch to Program '0' (The built-in map logic)
    try:
        traci.trafficlight.setProgram(jid, "0")
    except:
        print("  Could not switch to program '0'.")
        continue

    # Inspect Logic
    current_prog = traci.trafficlight.getProgram(jid)
    logics = traci.trafficlight.getAllProgramLogics(jid)

    target_logic = None
    for l in logics:
        if l.programID == "0":
            target_logic = l
            break

    if not target_logic:
        print("  Default logic not found.")
        continue

    print(f"  Type: {target_logic.type} (0=Static, 1=Actuated)")
    print(f"  Total Phases: {len(target_logic.phases)}")

    green_phase_count = 0

    for i, phase in enumerate(target_logic.phases):
        # 'G' = Priority Green, 'g' = Yield Green (turn), 'y' = Yellow, 'r' = Red
        is_green = ("G" in phase.state) or ("g" in phase.state)
        is_yellow = "y" in phase.state

        type_str = "RED/OTHER"
        if is_green and not is_yellow:
            type_str = "GREEN"
            green_phase_count += 1
        elif is_yellow:
            type_str = "YELLOW"

        print(f"    Phase {i}: {phase.duration}s | {phase.state} | {type_str}")

    print(f"  >> Usable Green Phases: {green_phase_count}")

    # Check for RL Compatibility
    if green_phase_count > 4:
        print("  ⚠️  COMPLEX: Too many phases for simple RL.")
    elif green_phase_count == 2:
        print("  ✅ PERFECT: Likely N+S and E+W.")
    print("")

traci.close()
