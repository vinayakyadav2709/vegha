'use client'

import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { formatWaitTime, getStatusColor } from '@/lib/api'

// TypeScript interfaces for the data
export interface Junction {
  id: number
  name: string
  location: { lat: number; lng: number }
  status: 'operational' | 'heavy_congestion' | 'medium_congestion' | 'light_congestion' | 'faulty' | 'offline'
  lanes: number
}

export interface JunctionStatus {
  junction_id: number
  traffic_lights: Array<{
    lane: 'north' | 'south' | 'east' | 'west'
    signal: 'red' | 'yellow' | 'green'
    remaining_time_sec: number
  }>
  average_wait_time_sec: number
  emergency_vehicle_priority: boolean
}

export interface Prediction {
  junction_id: number
  predicted_congestion: 'light' | 'medium' | 'severe'
  timeframe: string
  expected_wait_time_sec: number
}

export interface MapEvent {
  id: string
  location: { lat: number; lng: number }
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  type?: string
  timestamp?: string
}

interface MapViewProps {
  junctions: Junction[]
  junctionStatuses: JunctionStatus[]
  predictions: Prediction[]
  events: MapEvent[]
}

// Helper functions for colors and styling
const getJunctionStatusColor = (status: string): string => {
  switch (status) {
    case 'operational':
      return '#22c55e' // green
    case 'light_congestion':
      return '#84cc16' // lime
    case 'medium_congestion':
      return '#eab308' // yellow
    case 'heavy_congestion':
      return '#ef4444' // red
    case 'faulty':
      return '#f97316' // orange
    case 'offline':
      return '#6b7280' // gray
    default:
      return '#6b7280'
  }
}

const getPredictionColor = (congestion: string): string => {
  switch (congestion) {
    case 'light':
      return '#22c55e' // green
    case 'medium':
      return '#eab308' // yellow
    case 'severe':
      return '#ef4444' // red
    default:
      return '#6b7280'
  }
}

const getEventColor = (severity: string): string => {
  switch (severity) {
    case 'low':
      return '#3b82f6' // blue
    case 'medium':
      return '#eab308' // yellow
    case 'high':
      return '#f97316' // orange
    case 'critical':
      return '#dc2626' // red
    default:
      return '#6b7280'
  }
}

const getSignalColor = (signal: string): string => {
  switch (signal) {
    case 'red':
      return '#ef4444'
    case 'yellow':
      return '#eab308'
    case 'green':
      return '#22c55e'
    default:
      return '#6b7280'
  }
}

const MapView: React.FC<MapViewProps> = ({
  junctions,
  junctionStatuses,
  predictions,
  events
}) => {
  // Helper to find junction status by ID
  const getJunctionStatus = (junctionId: number): JunctionStatus | undefined => {
    return junctionStatuses.find(status => status.junction_id === junctionId)
  }

  // Helper to find prediction by junction ID
  const getPrediction = (junctionId: number): Prediction | undefined => {
    return predictions.find(pred => pred.junction_id === junctionId)
  }

  return (
    <div className="h-full w-full">
      <MapContainer
        center={[12.9716, 77.5946]}
        zoom={12}
        className="h-full w-full"
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        <LayersControl position="topright">
          {/* Sensor Status Layer */}
          <LayersControl.Overlay checked name="Sensor Status">
            <>
              {junctions
                .filter(junction => junction && junction.location && 
                  typeof junction.location.lat === 'number' && 
                  typeof junction.location.lng === 'number')
                .map((junction) => {
                const status = getJunctionStatus(junction.id)
                return (
                  <CircleMarker
                    key={`sensor-${junction.id}`}
                    center={[junction.location.lat, junction.location.lng]}
                    radius={8}
                    pathOptions={{
                      fillColor: getJunctionStatusColor(junction.status),
                      color: '#fff',
                      weight: 2,
                      opacity: 1,
                      fillOpacity: 0.8
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-bold text-lg mb-2">{junction.name || `Junction ${junction.id}`}</h3>
                        <div className="space-y-1">
                          <p><strong>Status:</strong> <span className={`capitalize ${getStatusColor(junction.status) === 'green' ? 'text-green-600' : getStatusColor(junction.status) === 'red' ? 'text-red-600' : getStatusColor(junction.status) === 'yellow' ? 'text-yellow-600' : 'text-gray-600'}`}>{junction.status?.replace('_', ' ') || 'unknown'}</span></p>
                          <p><strong>Lanes:</strong> {junction.lanes || 'N/A'}</p>
                          {status && (
                            <>
                              <p><strong>Average Wait:</strong> {formatWaitTime(status.average_wait_time_sec)}</p>
                              <p><strong>Emergency Priority:</strong> {status.emergency_vehicle_priority ? 'Active' : 'Inactive'}</p>
                              <div className="mt-2">
                                <p className="font-semibold">Traffic Lights:</p>
                                <div className="grid grid-cols-2 gap-1 mt-1">
                                  {status.traffic_lights?.map((light, idx) => (
                                    <div key={idx} className="text-xs">
                                      <span className="capitalize">{light.lane}:</span>
                                      <span 
                                        className="ml-1 font-semibold"
                                        style={{ color: getSignalColor(light.signal) }}
                                      >
                                        {light.signal?.toUpperCase() || 'OFF'}
                                      </span>
                                      <span className="text-gray-500 ml-1">
                                        ({light.remaining_time_sec || 0}s)
                                      </span>
                                    </div>
                                  )) || <div className="text-xs text-gray-500">No data</div>}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </>
          </LayersControl.Overlay>

          {/* Traffic Predictions Layer */}
          <LayersControl.Overlay name="Traffic Predictions">
            <>
              {junctions
                .filter(junction => junction && junction.location && 
                  typeof junction.location.lat === 'number' && 
                  typeof junction.location.lng === 'number')
                .map((junction) => {
                const prediction = getPrediction(junction.id)
                if (!prediction) return null

                return (
                  <CircleMarker
                    key={`prediction-${junction.id}`}
                    center={[junction.location.lat, junction.location.lng]}
                    radius={12}
                    pathOptions={{
                      fillColor: getPredictionColor(prediction.predicted_congestion),
                      color: '#fff',
                      weight: 2,
                      opacity: 1,
                      fillOpacity: 0.6
                    }}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <h3 className="font-bold text-lg mb-2">{junction.name || `Junction ${junction.id}`}</h3>
                        <div className="space-y-1">
                          <p><strong>Predicted Congestion:</strong> 
                            <span className={`capitalize ml-1 font-semibold ${
                              prediction.predicted_congestion === 'light' ? 'text-green-600' :
                              prediction.predicted_congestion === 'medium' ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {prediction.predicted_congestion || 'unknown'}
                            </span>
                          </p>
                          <p><strong>Timeframe:</strong> {prediction.timeframe || 'N/A'}</p>
                          <p><strong>Expected Wait:</strong> {formatWaitTime(prediction.expected_wait_time_sec || 0)}</p>
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </>
          </LayersControl.Overlay>

          {/* Events Layer */}
          <LayersControl.Overlay name="Events">
            <>
              {events
                .filter(event => event && event.location && 
                  typeof event.location.lat === 'number' && 
                  typeof event.location.lng === 'number')
                .map((event) => (
                <CircleMarker
                  key={`event-${event.id}`}
                  center={[event.location.lat, event.location.lng]}
                  radius={10}
                  pathOptions={{
                    fillColor: getEventColor(event.severity),
                    color: '#fff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.7
                  }}
                >
                  <Popup>
                    <div className="p-2 min-w-[180px]">
                      <h3 className="font-bold text-lg mb-2">{event.title || 'Unknown Event'}</h3>
                      <div className="space-y-1">
                        <p><strong>Severity:</strong> 
                          <span className={`capitalize ml-1 font-semibold ${
                            event.severity === 'low' ? 'text-blue-600' :
                            event.severity === 'medium' ? 'text-yellow-600' :
                            event.severity === 'high' ? 'text-orange-600' :
                            'text-red-600'
                          }`}>
                            {event.severity || 'unknown'}
                          </span>
                        </p>
                        {event.type && <p><strong>Type:</strong> {event.type}</p>}
                        {event.timestamp && (
                          <p><strong>Time:</strong> {new Date(event.timestamp).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </>
          </LayersControl.Overlay>
        </LayersControl>
      </MapContainer>
    </div>
  )
}

export default MapView