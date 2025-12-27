export const dynamic = "force-dynamic";


import { Suspense } from 'react'
import { 
  TrendingUp, 
  Clock, 
  MapPin, 
  Brain,
  AlertTriangle,
  BarChart3
} from 'lucide-react'
import { getPredictions, getPredictionCongestionColor, formatWaitTime, type PredictionsData } from '@/lib/api'
import TrafficFlowChart from '@/components/TrafficFlowChart'

// Loading component
function PredictionsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="animate-pulse">
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-64 mb-2"></div>
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-96"></div>
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Congestion Forecast */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="animate-pulse">
            <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-4"></div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-300 dark:bg-gray-600 rounded mb-3"></div>
            ))}
          </div>
        </div>

        {/* Peak Hours */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="animate-pulse">
            <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-4"></div>
            <div className="h-20 bg-gray-300 dark:bg-gray-600 rounded mb-3"></div>
            <div className="h-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </div>

        {/* Traffic Flow Chart */}
        <div className="md:col-span-2 xl:col-span-1 bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="animate-pulse">
            <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-40 mb-4"></div>
            <div className="h-64 bg-gray-300 dark:bg-gray-600 rounded"></div>
          </div>
        </div>
      </div>

      {/* AI Insights Skeleton */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded w-32 mb-4"></div>
          <div className="h-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    </div>
  )
}

// Main Predictions Content Component
async function PredictionsContent() {
  try {
    const data = await getPredictions()
    
    // Debug: Log the data structure
    console.log('Predictions data:', JSON.stringify(data, null, 2))
    
    // Safely check if predictions exists
    if (!data.predictions || !Array.isArray(data.predictions)) {
      console.error('Missing predictions array:', data)
      throw new Error('Invalid data structure: missing predictions array')
    }

    // Create mock chart data since we don't have traffic flow data
    const chartData = [
      { time: '8 AM', predicted: 1200, current: 1100 },
      { time: '9 AM', predicted: 1500, current: 1400 },
      { time: '10 AM', predicted: 1700, current: 1650 },
      { time: '11 AM', predicted: 1600, current: 1580 },
    ]

    return (
      <div className="gap-6 space-y-6">
        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Junction Predictions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Junction Predictions
              </h3>
            </div>
            
            <div className="gap-3 space-y-3">
              {data.predictions.map((prediction) => (
                <div
                  key={prediction.junction_id}
                  className={`p-3 rounded-2xl border-2 border-gray-200 dark:border-gray-700 ${getPredictionCongestionColor(prediction.predicted_congestion)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">Junction {prediction.junction_id}</span>
                    </div>
                    <span className="text-sm font-semibold uppercase tracking-wide text-gray-900 dark:text-gray-100">
                      {prediction.predicted_congestion}
                    </span>
                  </div>
                  <div className="mt-2 text-sm opacity-75">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Wait time:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formatWaitTime(prediction.expected_wait_time_sec)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Timeframe:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{prediction.timeframe.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-md p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Summary Statistics
              </h3>
            </div>
            
            <div className="gap-4 space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">Severe Congestion</p>
                    <p className="text-2xl font-semibold text-red-700 dark:text-red-300">
                      {data.predictions.filter(p => p.predicted_congestion === 'severe').length}
                    </p>
                  </div>
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
              </div>
              
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Medium Congestion</p>
                    <p className="text-2xl font-semibold text-amber-700 dark:text-amber-300">
                      {data.predictions.filter(p => p.predicted_congestion === 'medium').length}
                    </p>
                  </div>
                  <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 dark:text-green-400 font-medium">Light Congestion</p>
                    <p className="text-2xl font-semibold text-green-700 dark:text-green-300">
                      {data.predictions.filter(p => p.predicted_congestion === 'light').length}
                    </p>
                  </div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Traffic Flow Trend Chart */}
          <TrafficFlowChart data={chartData} />
        </div>

        {/* Average Wait Times */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="w-6 h-6 text-blue-600 dark:text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Wait Time Analysis
            </h3>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Average Wait Time</p>
                <p className="text-xl font-semibold text-blue-600 dark:text-blue-500">
                  {formatWaitTime(Math.round(data.predictions.reduce((sum, p) => sum + p.expected_wait_time_sec, 0) / data.predictions.length))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Longest Wait</p>
                <p className="text-xl font-semibold text-red-500 dark:text-red-400">
                  {formatWaitTime(Math.max(...data.predictions.map(p => p.expected_wait_time_sec)))}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Shortest Wait</p>
                <p className="text-xl font-semibold text-green-500 dark:text-green-400">
                  {formatWaitTime(Math.min(...data.predictions.map(p => p.expected_wait_time_sec)))}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error('Error loading predictions:', error)
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
        <div className="flex items-center space-x-3 mb-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
            Error Loading Predictions
          </h3>
        </div>
        <p className="text-red-700 dark:text-red-300">
          {error instanceof Error ? error.message : 'Failed to load prediction data. Please check your predictions.json file structure.'}
        </p>
      </div>
    )
  }
}

// Main Page Component
export default function PredictionsPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Traffic Predictions</h1>
        <p className="text-gray-600 dark:text-gray-400">AI-powered traffic forecasts and insights</p>
      </div>
      
      <Suspense fallback={<PredictionsSkeleton />}>
        <PredictionsContent />
      </Suspense>
    </div>
  )
}