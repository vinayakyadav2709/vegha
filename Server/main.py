import eventlet

eventlet.monkey_patch()

import sys
import os

sys.path.append("/app/FDRL")

import yaml
from flask import Flask, send_file, request
from flask_socketio import SocketIO

# Add FDRL path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "FDRL"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "app"))

# Load config
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.yaml")
with open(CONFIG_PATH) as f:
    CONFIG = yaml.safe_load(f)

MODE = CONFIG.get("mode", "sumo_events")
SUMO_MODE = "vegha"
# Flask app
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")


@app.route("/api/mode", methods=["POST"])
def set_mode():
    global SUMO_MODE
    print("current_mode:", SUMO_MODE)
    data = request.get_json()
    mode = data.get("mode")

    if mode not in ["vegha", "fixed"]:
        return {"error": "Invalid mode"}, 400

    SUMO_MODE = mode
    sumo_manager.mode = mode
    sumo_manager.reset_simulation()
    sumo_manager.start_simulation()
    print(f"🔄 Simulation mode changed to {mode}")
    return {"message": f"Mode set to {mode}"}, 200


@app.route("/api/mode", methods=["GET"])
def get_mode():
    return {"mode": SUMO_MODE}, 200





@app.route("/images/<filename>")
def serve_image(filename):
    """Serve vehicle images from /app/images/"""
    img_path = f"app/templates/images/{filename}"

    if os.path.exists(img_path):
        print(f"✅ Serving: {filename}")
        return send_file(img_path)

    print(f"❌ Not found: {img_path}")
    return {"error": "Image not found"}, 404


# Import core modules
from core.sumo_manager import SUMOManager
# EventManager is imported later from app.event_manager
from api import socketio_handlers

# Select mode
if MODE == "sumo_events":
    from modes.sumo_events import SUMOEventsMode

    mode_class = SUMOEventsMode
    print("📌 Mode: SUMO + Events")

elif MODE == "sumo_rl_events":
    from modes.sumo_rl_events import SUMORLEventsMode

    mode_class = SUMORLEventsMode
    print("🤖 Mode: SUMO + Events + RL")

else:
    raise ValueError(f"❌ Unknown mode: {MODE}")

from app.api.routes import register_routes

# Initialize managers
sumo_manager = SUMOManager(CONFIG)
# Use our Extended EventManager from app/
from app.event_manager import EventManager
event_manager = EventManager(sumo_manager)
current_mode = mode_class(sumo_manager, event_manager, socketio, CONFIG)

# Register SocketIO handlers
socketio_handlers.register_socketio_handlers(
    socketio, sumo_manager, event_manager, current_mode
)

# Register API Routes
register_routes(app, sumo_manager, event_manager, socketio)

if __name__ == "__main__":
    print("=" * 60)
    print("🚦 Vegha Traffic Management System")
    print("=" * 60)
    print("🚦 Vegha Backend Started")
    print("=" * 60)

    # Start simulation in background
    # Start SUMO once, but NOT the loop

    # Run server
    socketio.run(
        app, host="0.0.0.0", port=3200, debug=False, allow_unsafe_werkzeug=True
    )
