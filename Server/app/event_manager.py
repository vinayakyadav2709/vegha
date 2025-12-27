class EventManager:
    """Manages scheduled traffic events"""
    
    def __init__(self, config):
        self.events = []
        self.event_id_counter = 1
    
    def create_event(self, streets, start_time, end_time):
        """Create new event"""
        event = {
            'id': self.event_id_counter,
            'streets': streets,
            'start_time': start_time,
            'end_time': end_time,
            'status': 'Pending'
        }
        self.events.append(event)
        self.event_id_counter += 1
        return event
    
    def update_event_statuses(self, current_time):
        """Update event statuses based on simulation time"""
        for event in self.events:
            if event['start_time'] <= current_time < event['end_time']:
                event['status'] = 'Active'
            elif current_time >= event['end_time']:
                event['status'] = 'Finished'
            else:
                event['status'] = 'Pending'
