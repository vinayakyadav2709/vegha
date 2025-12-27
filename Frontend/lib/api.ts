import type { EventsResponse,MapEventsResponse } from '@/app/types/events'
// Types for the dashboard data
export interface DashboardData {
  system_status: 'operational' | 'warning' | 'critical'
  traffic_overview: {
    total_junctions: number
    active_junctions: number
    average_congestion: 'light' | 'moderate' | 'heavy'
  }
  current_metrics: {
    total_vehicles: number
    emergency_vehicles: number
    active_events: number
    average_wait_time_sec: number
  }
  alerts: Array<{
    type: 'critical' | 'warning' | 'info'
    message: string
  }>
}
// Types for emergency vehicles
export interface EmergencyVehicle {
  id: string
  type: 'ambulance' | 'fire_truck' | 'police' | string
  location: { lat: number; lng: number }
  destination: string
  priority: 'critical' | 'high' | 'medium' | string
  eta_min: number
  route: string[]
  status: 'en_route' | 'responding' | 'patrolling' | string
  registration: string
}
export interface VIPMovementAlert {
  movement_id: string
  route: string
  start_time: string
  estimated_duration_min: number
  affected_routes: string[]
  traffic_clearance: string
  security_level: string
  diversions_active: boolean
}

export interface EmergencyData {
  active_emergency_vehicles: EmergencyVehicle[]
  total_count: number
  priority_overrides_active: number
  vip_movement_alerts: VIPMovementAlert[]
  timestamp: string
}

// Types for the predictions data
export interface PredictionsData {
  predictions: Array<{
    junction_id: number
    predicted_congestion: 'severe' | 'medium' | 'light'
    timeframe: string
    expected_wait_time_sec: number
  }>
}

// Generic fetch function for JSON files in public/data/
export async function fetchData(file: string) {
  // For server-side requests, use absolute URL
  const baseURL = process.env.NODE_ENV === 'production' 
    ? 'https://vegha.vercel.app' // Replace with your actual domain
    : 'http://localhost:3000';
    
  const res = await fetch(`${baseURL}/data/${file}`, {
    headers: { "Cache-Control": "no-cache" }
  });
  
  if (!res.ok) throw new Error(`Failed to fetch ${file}`);
  return res.json();
}

// Dashboard
export const getDashboard = (): Promise<DashboardData> => fetchData("dashboard.json");

// Junctions
export const getJunctions = () => fetchData("junctions.json");

// Junction live status (signals, timings)
export const getJunctionStatus = () => fetchData("junctionStatus.json");

// Routes
export const getRoutes = () => fetchData("routes.json");

// Vehicle counts
export const getVehicles = () => fetchData("vehicles.json");

// Emergency vehicles
export const getEmergencyVehicles = (): Promise<EmergencyData> => fetchData("emergency.json");


// Predictions
export const getPredictions = (): Promise<PredictionsData> => fetchData("predictions.json");

// Events
// In your existing lib/api.ts, make sure getEvents returns the full response
export const getEvents = (): Promise<EventsResponse> => fetchData("events.json");
export const getMapEvents = (): Promise<MapEventsResponse> => fetchData("mapevents.json");

// Helper function to format wait time
export function formatWaitTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${remainingSeconds}s`
}

// Helper function to get congestion color
export function getCongestionColor(level: string): string {
  switch (level) {
    case 'light':
      return 'text-green-600 dark:text-green-400'
    case 'moderate':
      return 'text-yellow-600 dark:text-yellow-400'
    case 'heavy':
      return 'text-red-600 dark:text-red-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

// Helper function to get alert color
// lib/api.ts (replace old getAlertColor)
export function getAlertColor(type: string) {
  switch (type) {
    case 'critical':
      return {
        container: 'border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/50 dark:text-red-200',
        icon: 'text-red-600 dark:text-red-300',
        text: 'text-red-800 dark:text-red-200',
      }
    case 'warning':
      return {
        container: 'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200',
        icon: 'text-yellow-600 dark:text-yellow-300',
        text: 'text-yellow-800 dark:text-yellow-200',
      }
    case 'info':
      return {
        container: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
        icon: 'text-blue-600 dark:text-blue-300',
        text: 'text-blue-800 dark:text-blue-200',
      }
    default:
      return {
        container: 'border-gray-200 bg-gray-50 text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200',
        icon: 'text-gray-600 dark:text-gray-300',
        text: 'text-gray-800 dark:text-gray-200',
      }
  }
}


// Helper function to get congestion level color for predictions
export function getPredictionCongestionColor(level: string): string {
  switch (level.toLowerCase()) {
    case 'light':
      return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    case 'medium':
      return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    case 'severe':
      return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    default:
      return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700'
  }
}

// Color based on priority
export function getEmergencyPriorityColor(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'critical':
      return 'text-red-600 dark:text-red-400'
    case 'high':
      return 'text-orange-600 dark:text-orange-400'
    case 'medium':
      return 'text-yellow-600 dark:text-yellow-400'
    default:
      return 'text-gray-600 dark:text-gray-400'
  }
}

// Status badges
export function getEmergencyStatusBadge(status: string): string {
  switch (status.toLowerCase()) {
    case 'en_route':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
    case 'responding':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
    case 'patrolling':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200'
    default:
      return 'bg-gray-50 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
  }
}
export const getStatusColor = (status: string) => {
  switch (status) {
    case 'operational': return 'green'
    case 'heavy_congestion': return 'red'
    case 'faulty': return 'yellow'
    default: return 'gray'
  }
}
