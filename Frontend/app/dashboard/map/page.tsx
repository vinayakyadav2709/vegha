export const dynamic = "force-dynamic";


import { getJunctions, getJunctionStatus, getPredictions, getMapEvents } from '@/lib/api'
import type { Junction, JunctionStatus, Prediction, MapEvent } from './MapView'
import MapClientWrapper from './MapClientWrapper'

export default async function MapPage() {
  const junctionsData = await getJunctions()
  const junctionStatusData = await getJunctionStatus()
  const predictionsData = await getPredictions()
  const mapEventsData = await getMapEvents()

  // Transform the data to match our component props with proper type casting
  const junctions: Junction[] = (junctionsData.junctions || []).map((j: any) => ({
    id: j.id,
    name: j.name,
    location: j.location,
    status: (j.status || 'offline') as 'operational' | 'heavy_congestion' | 'medium_congestion' | 'light_congestion' | 'faulty' | 'offline',
    lanes: j.lanes,
  }))

  const junctionStatuses: JunctionStatus[] = (Array.isArray(junctionStatusData)
    ? junctionStatusData
    : [junctionStatusData]
  ).map((js: any) => ({
    ...js,
    status: (js.status || 'offline') as 'operational' | 'heavy_congestion' | 'medium_congestion' | 'light_congestion' | 'faulty' | 'offline',
  }))

  const predictions: Prediction[] = predictionsData.predictions || []
  const events: MapEvent[] = mapEventsData.events || []

  return (
    <div className="h-screen w-full">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Traffic Management Map
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Real-time traffic monitoring and predictions
            </p>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Operational</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <span className="text-gray-600 dark:text-gray-400">Congestion</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Critical</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="h-[calc(100vh-88px)]">
        <MapClientWrapper
          junctions={junctions}
          junctionStatuses={junctionStatuses}
          predictions={predictions}
          events={events}
        />
      </div>
    </div>
  )
}

