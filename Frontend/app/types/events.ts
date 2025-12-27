import type { MapEvent } from '../dashboard/map/MapView';

export interface EventLocation {
  junction_id?: string;
  route_id?: string;
  description: string;
}

export interface EventImpact {
  affected_routes: string[];
  estimated_delay_min: number;
  lanes_blocked?: number;
  complete_closure?: boolean;
  diverted_traffic?: boolean;
  emergency_services_required?: boolean;
  alternate_routes_suggested?: string[];
  bus_route_diversions?: string[];
}

export interface Event {
  id: string;
  title: string;
  description: string;
  type:
    | 'construction'
    | 'accident'
    | 'religious_event'
    | 'weather'
    | 'protest'
    | 'maintenance'
    | string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: EventLocation;
  start_time: string;
  end_time?: string;
  estimated_duration_min?: number;
  status: 'active' | 'scheduled' | 'completed' | 'cancelled' | 'inactive';
  impact: EventImpact;
  authorities: string[];
  authorities_notified?: string[];
  crowd_estimate?: number;
  incident_number?: string;
  created_by: string;
  created_at: string;
  last_modified: string;
}

export interface EventsResponse {
  events: Event[];
  total_count: number;
  active_count: number;
  timestamp: string;
}

export interface MapEventsResponse {
  events: MapEvent[];
  total_count: number;
  active_count: number;
  timestamp: string;
}

// Helper type for event filtering
export type EventStatus = Event['status'];
export type EventSeverity = Event['severity'];
export type EventType = Event['type'];

/* ----------------------------- */
/* ✅ Add Event form state types */
/* ----------------------------- */

export type LocationMode = 'junction' | 'route' | 'custom';
export type AuthoritiesMode = 'authorities' | 'custom';

/**
 * NewEventState is UI/form state (strings are kept as strings until submit).
 * This prevents TS errors with empty selects and text inputs. [web:2239]
 */
export type NewEventState = {
  id: string;
  title: string;
  description: string;

  type: string;
  severity: EventSeverity | '';
  status: EventStatus;

  locationMode: LocationMode;
  junction_id: string;
  route_id: string;
  location_description: string;

  start_time: string;
  end_time: string;

  affected_routes: string[];
  estimated_delay_min: string;

  authoritiesMode: AuthoritiesMode;
  authorities: string[];

  created_by: string;
};

export const initialNewEventState: NewEventState = {
  id: '',
  title: '',
  description: '',
  type: '',
  severity: '',
  status: 'scheduled',

  locationMode: 'junction',
  junction_id: '',
  route_id: '',
  location_description: '',

  start_time: '',
  end_time: '',

  affected_routes: [],
  estimated_delay_min: '',

  authoritiesMode: 'authorities',
  authorities: [],

  created_by: 'system',
};
