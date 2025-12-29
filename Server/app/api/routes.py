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
        event_id = data.get("id")
        title = data.get("title")
        streets = list(data.get("streets")) # List of street IDs (COPY)
        
        print(f"DEBUG: create_event received streets: {streets}")
        
        # Validate
        if not streets or not title:
             return jsonify({"error": "Missing required fields (title, streets)"}), 400

        if not sumo_mgr.simulation_running:
            return jsonify({"error": "Sim not running"}), 400
        
        # Auto-generate ID if missing
        if not event_id:
            import time
            event_id = f"evt_{int(time.time())}"
        
        # Check uniqueness
        if event_mgr.id_exists(event_id):
             return jsonify({"error": "Event ID already exists"}), 400

        # Create Event
        event = event_mgr.create_event(event_id, title, streets)
        
        # Functionally close the streets
        # Functionally close the streets
        for street_id in streets:
            # Use force_close_street to avoid removing it from the event!
            print(f"DEBUG: Closing street: {street_id}")
            event_mgr.force_close_street(street_id)
            
        # Emit update
        socketio.emit("event_created", event)
        
        # Also emit standard street status update
        socketio.emit("street_status", {
            "success": True,
            "action": "closed_bulk",
            "streets": streets,
            "closed_streets": list(sumo_mgr.closed_streets)
        })
        
        return jsonify({"message": "Event created", "event": event}), 201
    
    @app.route("/api/streets/close", methods=["POST"])
    def close_street():
        street = request.json.get("street")
        print(f"DEBUG: Closing street: {street}")
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

    @app.route("/api/events/remove", methods=["POST"])
    def remove_event():
        event_id = request.json.get("id")
        if not event_id:
             return jsonify({"error": "Missing event id"}), 400
             
        success = event_mgr.remove_event(event_id)
        if not success:
            return jsonify({"error": "Event not found"}), 404
            
        # Emit update so all clients refresh
        socketio.emit("event_removed", {"id": event_id})
        
        # Also emit street status to force map refresh if needed
        socketio.emit("street_status", {
            "success": True,
            "action": "opened_bulk", 
            "closed_streets": list(sumo_mgr.closed_streets)
        })
        
        return jsonify({"success": True})

        