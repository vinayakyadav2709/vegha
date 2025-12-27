export const dynamic = "force-dynamic";


import { getJunctions, getJunctionStatus, getPredictions, getMapEvents } from '@/lib/api'
import type { Junction, JunctionStatus, Prediction, MapEvent } from './MapView'
import MapClientWrapper from './MapClientWrapper'

export default async function MapPage() {
  try {
    // Fetch all required data server-side
    const [junctionsData, junctionStatusData, predictionsData, eventsData] = await Promise.all([
      getJunctions(),
      getJunctionStatus(),
      getPredictions(),
      getMapEvents()
    ])

    // Transform the data to match our component props
    const junctions: Junction[] = junctionsData.junctions || []
    const junctionStatuses: JunctionStatus[] = Array.isArray(junctionStatusData) 
      ? junctionStatusData 
      : [junctionStatusData]
    const predictions: Prediction[] = predictionsData.predictions || []
    const events: MapEvent[] = eventsData.events

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
  } catch (error) {
    console.error('Error loading map data:', error)
    
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Failed to load map data
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Please check your data files and try again.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
}

