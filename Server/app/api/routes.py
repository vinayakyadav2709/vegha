from flask import jsonify, request, send_file

def register_routes(app, sumo_mgr, event_mgr, socketio):
    
    @app.route("/")
    def index():
        return send_file("app/templates/frame.html")
    
    @app.route("/style.css")
    def serve_css():
        return send_file("app/templates/style.css", mimetype="text/css")
    
    @app.route("/api/streets")
    def get_streets():
        if sumo_mgr.simulation_running:
            sumo_mgr.load_available_streets()
        return jsonify({
            'streets': sumo_mgr.available_streets,
            'total': len(sumo_mgr.available_streets),
            'closed': list(sumo_mgr.closed_streets)
        })
    
    @app.route("/api/events", methods=["GET"])
    def get_events():
        return jsonify({"events": event_mgr.events})
    
    @app.route("/api/events/create", methods=["POST"])
    def create_event():
        data = request.get_json()
        streets = data.get("streets")
        start_time = data.get("start_time")
        end_time = data.get("end_time")
        
        if not sumo_mgr.simulation_running:
            return jsonify({"error": "Sim not running"}), 400
        
        event = event_mgr.create_event(streets, start_time, end_time)
        socketio.emit("event_update", event_mgr.events)
        
        return jsonify({"message": "Event created", "event": event}), 201
    
    @app.route("/api/streets/close", methods=["POST"])
    def close_street():
        street = request.json.get("street")
        event_mgr.handle_manual_close(street)
        socketio.emit("street_status", {
            "action": "closed",
            "street": street,
            "closed_streets": list(sumo_mgr.closed_streets)
        })
        return jsonify({"success": True})
    
    @app.route("/api/streets/open", methods=["POST"])
    def open_street():
        street = request.json.get("street")
        event_mgr.handle_manual_open(street)
        socketio.emit("street_status", {
            "action": "opened",
            "street": street,
            "closed_streets": list(sumo_mgr.closed_streets)
        })
        return jsonify({"success": True})

        