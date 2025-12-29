export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';
export type EventStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

export interface Event {
  id: string;
  title: string;
  description?: string;
  type?: string;
  severity?: EventSeverity;
  status: EventStatus;
  streets: string[];
  start_time?: string;
  end_time?: string;
  created_by?: string;
  created_at?: string;
  // ✅ Added optional location to match frontend usage
  location?: {
    description?: string;
    junction_id?: string;
    route_id?: string;
  };
}

export type EventsResponse = {
  events: Event[];
  // ✅ Added fields returned by the backend /api/events
  total_count: number;
  active_count: number;
  timestamp: string;
};

export type NewEventState = {
  id: string;
  title: string;
  description?: string;
  type: string;
  severity: string;
  status: EventStatus;
  streets: string[];
};

export const initialNewEventState: NewEventState = {
  id: '',
  title: '',
  description: '',
  type: '',
  severity: '',
  status: 'scheduled',
  streets: [],  // ✅ Added - was missing
};
