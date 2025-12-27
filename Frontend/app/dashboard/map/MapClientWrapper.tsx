'use client';

import dynamic from 'next/dynamic';
import type { Junction, JunctionStatus, Prediction, MapEvent } from './MapView';

const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400">Loading map...</p>
      </div>
    </div>
  ),
});

interface MapClientWrapperProps {
  junctions: Junction[];
  junctionStatuses: JunctionStatus[];
  predictions: Prediction[];
  events: MapEvent[];
}

export default function MapClientWrapper(props: MapClientWrapperProps) {
  return <MapView {...props} />;
}
