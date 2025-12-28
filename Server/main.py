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
    data = request.get_json()
    mode = data.get("mode")

    if mode not in ["vegha", "fixed"]:
        return {"error": "Invalid mode"}, 400

    SUMO_MODE = mode
    sumo_manager.mode = mode
    sumo_manager.close_simulation()
    sumo_manager.start_simulation()

    return {"message": f"Mode set to {mode}"}, 200


@app.route("/api/mode", methods=["GET"])
def get_mode():
    return {"mode": SUMO_MODE}, 200


# ✅ ADD THESE ROUTES - LIKE DUMMY SERVER
@app.route("/")
def index():
    return send_file("app/templates/frame.html")


@app.route("/style.css")
def serve_css():
    return send_file("app/templates/style.css", mimetype="text/css")


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
from core.event_manager import EventManager
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

# Initialize managers
sumo_manager = SUMOManager(CONFIG.get("simulation", {}))
event_manager = EventManager(CONFIG)
current_mode = mode_class(sumo_manager, event_manager, socketio, CONFIG)

# Register SocketIO handlers
socketio_handlers.register_socketio_handlers(
    socketio, sumo_manager, event_manager, current_mode
)

if __name__ == "__main__":
    print("=" * 60)
    print("🚦 Vegha Traffic Management System")
    print("=" * 60)
    print("🚦 Vegha Backend Started")
    print("=" * 60)

    # Start simulation in background
    socketio.start_background_task(target=current_mode.run)

    # Run server
    socketio.run(
        app, host="0.0.0.0", port=5000, debug=False, allow_unsafe_werkzeug=True
    )
