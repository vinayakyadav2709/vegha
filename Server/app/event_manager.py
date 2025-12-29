from core.event_manager import EventManager as BaseEventManager
import random

class EventManager(BaseEventManager):
    """Extended EventManager for Vegha Event Mode"""
    
    def __init__(self, sumo_manager):
        super().__init__(sumo_manager)
        # Ensure events list exists if base didn't create it (it likely did)
        if not hasattr(self, 'events'):
             self.events = []
    
    def title_exists(self, title):
        return any(e.get('title') == title for e in self.events)

    def id_exists(self, event_id):
        return any(e.get('id') == event_id for e in self.events)

    def generate_color(self):
        """Generate a random bright color for the event"""
        return "#{:06x}".format(random.randint(0, 0xFFFFFF))

    def create_event(self, event_id, title, streets):
        """Create new event with detailed properties"""
        print(f"DEBUG: Extended create_event called on instance {id(self)}")
        color = self.generate_color()
        
        event = {
            'id': event_id,
            'title': title,
            'streets': streets,
            'color': color,
            'status': 'Active',
            'type': 'manual_event',
            'start_time': 0,
            'end_time': 99999999
        }
        self.events.append(event)
        return event

    def get_events(self):
        return self.events
