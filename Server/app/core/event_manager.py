import traci

class EventManager:
    def __init__(self, sumo_manager):
        self.sumo = sumo_manager
        self.events = []
        self.event_id_counter = 1
    
    def create_event(self, streets, start_time, end_time):
        event = {
            "id": self.event_id_counter,
            "streets": streets,
            "start_time": start_time,
            "end_time": end_time,
            "status": "Pending"
        }
        self.events.append(event)
        self.event_id_counter += 1
        print(f"📅 Event {event['id']}: {streets} [{start_time}s-{end_time}s]")
        return event
    
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
            traci.edge.setDisallowed(street, ["all"])
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
        all_vtypes = [
            "passenger", "taxi", "bus", "truck", "trailer",
            "motorcycle", "moped", "bicycle", "pedestrian",
            "emergency", "delivery"
        ]
        try:
            traci.edge.setAllowed(street, all_vtypes)
            self.sumo.closed_streets.discard(street)
            print(f"✅ Opened: {street}")
        except Exception as e:
            print(f"⚠️ Error opening {street}: {e}")

    def force_close_street(self, street):
        """Closes a street physically without removing it from any event."""
        self._traci_close(street)

    def _activate_event(self, event):
        for street in event["streets"]:
            if street not in self.sumo.closed_streets:
                print(f"🚫 Event {event['id']}: Closing {street}")
                self._traci_close(street)
    
    def _deactivate_event(self, event):
        for street in event["streets"]:
            if street not in self.sumo.closed_streets:
                print(f"✅ Event {event['id']}: Opening {street}")
                self._traci_open(street)
    
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
