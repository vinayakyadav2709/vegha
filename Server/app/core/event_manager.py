import traci

class EventManager:
    def __init__(self, sumo_manager):
        self.sumo = sumo_manager
        self.events = []
        self.event_id_counter = 1
    
    # Updated signature to match routes.py call
    def create_event(self, event_id, title, streets):
        event = {
            "id": event_id,
            "title": title,
            "streets": streets,
            "status": "Active", # Default to Active since we close streets immediately
            "start_time": 0,
            "end_time": 0
        }
        self.events.append(event)
        print(f"📅 Event Created - ID: {event_id}, Title: {title}, Streets: {len(streets)}")
        return event

    def id_exists(self, event_id):
        return any(e['id'] == event_id for e in self.events)
    
    def update_event_statuses(self, current_time):
        for event in self.events:
            old_status = event.get("status", "Pending")
            
            if current_time < event["start_time"]:
                new_status = "Pending"
            elif current_time >= event["start_time"] and current_time < event["end_time"]:
                new_status = "Active"
            else:
                new_status = "Finished"
            
            if old_status != new_status:
                event["status"] = new_status
                print(f"✅ Event {event['id']}: {old_status} → {new_status}")
                
                if new_status == "Active":
                    self._activate_event(event)
                elif new_status == "Finished":
                    self._deactivate_event(event)
    
    def _traci_close(self, street):
        street = street.lstrip('+')
        try:
            # Match socketio_handlers.py explicit list
            # REMOVED invalid classes: ambulance, car, motorcycle_motorcycle, bus_bus, veh_passenger, truck_truck
            # "ambulance" is covered by "emergency". "car" is "passenger".
            disallowed_types = [
                "passenger", "taxi", "bus", "truck", "trailer",
                "motorcycle", "moped", "bicycle", "pedestrian",
                "emergency", "delivery"
            ]
            traci.edge.setDisallowed(street, disallowed_types)
            
            # Remove vehicles on this street
            for veh in traci.edge.getLastStepVehicleIDs(street):
                try:
                    traci.vehicle.remove(veh)
                except:
                    pass
                    
            self.sumo.closed_streets.add(street)
            print(f"🚫 Closed: {street}")
        except Exception as e:
            print(f"⚠️ Error closing {street}: {e}")

    def _traci_open(self, street):
        street = street.lstrip('+')
        try:
            # Match socketio_handlers.py explicit list
            allowed_types = [
                "passenger", "taxi", "bus", "truck", "trailer",
                "motorcycle", "moped", "bicycle", "pedestrian",
                "emergency", "delivery"
            ]
            traci.edge.setAllowed(street, allowed_types)
            self.sumo.closed_streets.discard(street)
            print(f"✅ Opened: {street}")
        except Exception as e:
            print(f"⚠️ Error opening {street}: {e}")

    def force_close_street(self, street):
        """Closes a street physically without removing it from any event."""
        self._traci_close(street)

    def _activate_event(self, event):
        for street in event["streets"]:
            # Robustness: Force close even if we think it's closed, 
            # to ensure vehicle removal and correct state.
            print(f"🚫 Event {event['id']}: Force Closing {street}")
            self._traci_close(street)
    
    def _deactivate_event(self, event):
        print(f"🛑 Deactivating Event: {event['id']}")
        
        for street in event["streets"]:
             # Robustness: Force open to ensure it's cleared.
            print(f"✅ Event {event['id']}: Force Opening {street}")
            self._traci_open(street)
        
        event["status"] = "inactive"
    
    def handle_manual_close(self, street):
        # Ensure no + prefix
        street = street.lstrip('+')
        
        # MANUAL close removes it from events (override behavior)
        for event in self.events:
            if street in event["streets"]:
                event["streets"].remove(street)
        
        self._traci_close(street)
    
    def handle_manual_open(self, street):
        street = street.lstrip('+')
        
        for event in self.events:
            if street in event["streets"]:
                event["streets"].remove(street)
        
        self._traci_open(street)

    def remove_event(self, event_id):
        print(f"DEBUG: Attempting to remove event_id: '{event_id}' (Type: {type(event_id)})")
        print(f"DEBUG: Base remove_event called on instance {id(self)}")
        print(f"DEBUG: Current Events: {[{'id': e['id'], 'type': type(e['id']).__name__} for e in self.events]}")
        
        # Try finding exact match
        event = next((e for e in self.events if str(e["id"]) == str(event_id)), None)
        
        if not event:
            print("❌ Event not found in list.")
            return False
            
        # Deactivate (open streets)
        self._deactivate_event(event) # Uses _traci_open internally
        
        self.events.remove(event)
        print(f"🗑️ Removed Event: {event_id}")
        return True
