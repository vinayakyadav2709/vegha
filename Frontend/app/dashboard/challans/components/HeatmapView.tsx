/**
 * HeatmapView.tsx
 * 
 * Purpose: Dual-mode map visualization for challan geo-distribution.
 * Must be dynamically imported due to Leaflet's window dependency.
 * 
 * Mode 1: Category View - Color-coded markers by violation type
 * Mode 2: Heatmap View - Heat intensity overlay for high violation areas across India
 * 
 * Features:
 * - Toggle between Category and Heatmap modes
 * - Circle markers with popups showing violation details
 * - Dynamic heatmap layer using leaflet.heat with intensity-based coloring
 * - Zoom-aware intensity (no false red zones when zoomed out)
 * - Color-coded legend for violation types
 * - India-focused base map
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Layers, Activity } from 'lucide-react';
import type { HeatmapPoint } from '@/app/types/challans';

interface HeatmapViewProps {
  data?: HeatmapPoint[];
}

type ViewMode = 'category' | 'heatmap';

// Violation type to color mapping
const violationColorMap: Record<string, string> = {
  SIGNAL_JUMP: '#EF4444',
  SPEEDING: '#F59E0B',
  NO_HELMET: '#EAB308',
  WRONG_LANE: '#3B82F6',
  PARKING_VIOLATION: '#8B5CF6',
  TRIPLE_RIDING: '#EC4899',
  MOBILE_USE: '#10B981',
  SEATBELT_VIOLATION: '#06B6D4',
  OVERLOADING: '#F97316',
  WRONG_SIDE_DRIVING: '#DC2626',
  DRUNK_DRIVING: '#991B1B',
  NO_PERMIT: '#7C3AED',
  MODIFIED_EXHAUST: '#EA580C',
  TINTED_GLASS: '#0891B2',
  POLLUTION_VIOLATION: '#65A30D',
  UNDERAGE_DRIVING: '#BE123C',
  NO_DOCUMENTS: '#9333EA',
  DANGEROUS_DRIVING: '#B91C1C',
  NO_PARKING: '#A855F7',
  FANCY_NUMBER_PLATE: '#DB2777',
  LANE_VIOLATION: '#2563EB',
  ZIGZAG_DRIVING: '#DC2626',
  RACING: '#C2410C',
  ACCIDENT_NO_STOP: '#7F1D1D',
  EXPIRED_LICENSE: '#6D28D9',
};

export default function HeatmapView({ data = [] }: HeatmapViewProps) {
  const mapRef = useRef<any>(null);
  const heatLayerRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('category');
  const [isReady, setIsReady] = useState(false);
  const [heatPluginReady, setHeatPluginReady] = useState(false);

  // Enhanced library checking with better logging
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max

    const checkLibraries = setInterval(() => {
      attempts++;
      const L = (window as any).L;
      
      console.log(`🔍 Attempt ${attempts}/${maxAttempts}:`, {
        leafletExists: !!L,
        heatLayerExists: L && typeof L.heatLayer === 'function',
        readyState: document.readyState
      });

      if (L && typeof L.heatLayer === 'function') {
        // Both Leaflet and leaflet.heat are loaded
        setIsReady(true);
        setHeatPluginReady(true);
        clearInterval(checkLibraries);
        console.log('✅ Both Leaflet and leaflet.heat ready!');
      } else if (L && typeof L.heatLayer !== 'function') {
        // Leaflet loaded but heatLayer not available yet
        setIsReady(true);
        console.warn('⚠️ Leaflet loaded, waiting for heat plugin...');
        
        // After 30 attempts (3 seconds) with Leaflet but no heat, give up
        if (attempts >= 30) {
          setHeatPluginReady(false);
          clearInterval(checkLibraries);
          console.warn('⚠️ Proceeding without heatmap overlay (markers only)');
        }
      }

      // Ultimate timeout fallback
      if (attempts >= maxAttempts) {
        console.error('❌ Timeout: Libraries did not load in time');
        clearInterval(checkLibraries);
        if (L) {
          setIsReady(true);
          setHeatPluginReady(false);
        }
      }
    }, 100);

    return () => clearInterval(checkLibraries);
  }, []);

  // Initialize map once
  useEffect(() => {
    if (!isReady || !mapContainerRef.current || mapRef.current) return;

    const L = (window as any).L;

    // Fix for default marker icons
    if (L.Icon?.Default?.prototype?._getIconUrl) {
      delete L.Icon.Default.prototype._getIconUrl;
    }
    
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    // Initialize map - India centered view with bounds restriction
    mapRef.current = L.map(mapContainerRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5,
      minZoom: 4,
      maxZoom: 12,
      maxBounds: [
        [6.0, 68.0],
        [37.0, 98.0]
      ],
      maxBoundsViscosity: 1.0
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    console.log('✅ Map initialized successfully');

    // Force resize after initialization
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 100);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isReady]);

  // Update layers when mode or data changes
  useEffect(() => {
    if (!mapRef.current || !isReady || !Array.isArray(data) || data.length === 0) return;

    const L = (window as any).L;

    // Clear existing layers
    if (heatLayerRef.current) {
      mapRef.current.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }
    markersRef.current.forEach((marker) => {
      if (mapRef.current) {
        mapRef.current.removeLayer(marker);
      }
    });
    markersRef.current = [];

    if (viewMode === 'heatmap') {
      // Check if heatLayer function exists
      if (typeof L.heatLayer !== 'function') {
        console.error('❌ L.heatLayer not available. Showing markers only.');
        setHeatPluginReady(false);
      } else {
        setHeatPluginReady(true);
        
        // ✅ Calculate max count for proper intensity scaling
        const maxCount = Math.max(...data.map(point => point.count));
        
        // ✅ Add heatmap layer with RAW counts (not normalized)
        const heatData = data.map((point) => [
          point.lat,
          point.lng,
          point.count // Use raw count, not normalized
        ]);
        
        heatLayerRef.current = L.heatLayer(heatData, {
          radius: 25,        // ✅ Smaller radius (was 60) - more accurate at zoom
          blur: 15,          // ✅ Less blur (was 40) - sharper boundaries
          maxZoom: 12,       // ✅ Increase to match map maxZoom
          max: maxCount,     // ✅ Set max to actual max count (not 1.0)
          minOpacity: 0.4,   // ✅ Lower minimum for better contrast
          gradient: {
            0.0: 'rgba(0, 0, 255, 0.0)',      // ✅ Fully transparent at 0 (no false reds)
            0.2: 'rgba(0, 255, 255, 0.4)',    // Cyan - very low
            0.4: 'rgba(0, 255, 0, 0.5)',      // Green - low
            0.6: 'rgba(255, 255, 0, 0.6)',    // Yellow - medium
            0.8: 'rgba(255, 128, 0, 0.75)',   // Orange - high
            1.0: 'rgba(255, 0, 0, 0.85)',     // Red - very high
          },
        }).addTo(mapRef.current);

        console.log('✅ Heatmap overlay added with', heatData.length, 'points, max count:', maxCount);
        
        // ✅ Add zoom event listener to adjust heatmap dynamically
        mapRef.current.on('zoomend', () => {
          const currentZoom = mapRef.current.getZoom();
          console.log('🔍 Current zoom level:', currentZoom);
          
          // Adjust radius and blur based on zoom level
          if (heatLayerRef.current && heatLayerRef.current.setOptions) {
            const dynamicRadius = currentZoom <= 5 ? 35 : 
                                  currentZoom <= 7 ? 25 : 
                                  currentZoom <= 9 ? 18 : 12;
            
            const dynamicBlur = currentZoom <= 5 ? 25 : 
                               currentZoom <= 7 ? 15 : 
                               currentZoom <= 9 ? 10 : 8;
            
            heatLayerRef.current.setOptions({
              radius: dynamicRadius,
              blur: dynamicBlur
            });
            
            console.log(`🎯 Heatmap adjusted: radius=${dynamicRadius}, blur=${dynamicBlur}`);
          }
        });
      }

      // Add markers for heatmap mode
      data.forEach((point) => {
        if (!mapRef.current) return;

        const radius = Math.max(5, Math.min(15, point.count / 3));
        
        const marker = L.circleMarker([point.lat, point.lng], {
          radius,
          fillColor: '#ffffff',
          color: '#1f2937',
          weight: 2,
          opacity: 0.8,
          fillOpacity: 0.7,
        }).addTo(mapRef.current);

        marker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 240px;">
            <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #1f2937; border-bottom: 3px solid #dc2626; padding-bottom: 8px;">
              📍 ${point.locationName}
            </h4>
            <div style="background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%); padding: 12px; border-radius: 8px; margin-bottom: 10px; border-left: 4px solid #dc2626;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                Total Violations
              </p>
              <p style="margin: 0; font-size: 28px; font-weight: 900; color: #dc2626; line-height: 1;">
                ${point.count}
              </p>
            </div>
            <div style="background: #f9fafb; padding: 10px; border-radius: 6px;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase;">
                Primary Type
              </p>
              <p style="margin: 0; font-size: 13px; color: #374151; font-weight: 700;">
                ${point.violationType.replace(/_/g, ' ')}
              </p>
            </div>
            <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e5e7eb;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 10px; color: #9ca3af; font-weight: 500;">
                  Zone ID: ${point.junctionId || 'N/A'}
                </span>
                <span style="background: #dc2626; color: white; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 700;">
                  🔥 HOT ZONE
                </span>
              </div>
            </div>
          </div>
        `);

        markersRef.current.push(marker);
      });

      // Set view to India
      if (data.length > 0 && mapRef.current) {
        const indiaBounds = L.latLngBounds(
          [8.0, 68.0],
          [35.0, 97.0]
        );
        mapRef.current.fitBounds(indiaBounds, { 
          padding: [40, 40],
          maxZoom: 5
        });
      }
    } else {
      // Category mode - color-coded markers
      data.forEach((point) => {
        if (!mapRef.current) return;

        const radius = Math.max(10, Math.min(30, point.count / 2));
        const color = violationColorMap[point.violationType] || '#3B82F6';

        const marker = L.circleMarker([point.lat, point.lng], {
          radius,
          fillColor: color,
          color: '#fff',
          weight: 3,
          opacity: 1,
          fillOpacity: 0.75,
        }).addTo(mapRef.current);

        marker.bindPopup(`
          <div style="font-family: sans-serif; min-width: 220px;">
            <h4 style="margin: 0 0 10px 0; font-size: 15px; font-weight: 700; color: #1f2937; border-bottom: 2px solid ${color}; padding-bottom: 8px;">
              📍 ${point.locationName}
            </h4>
            <div style="background: ${color}15; padding: 8px; border-radius: 6px; margin-bottom: 8px; border-left: 4px solid ${color};">
              <p style="margin: 0 0 6px 0; font-size: 13px; color: #374151;">
                <strong style="color: #1f2937;">Violation Type:</strong><br/>
                <span style="color: ${color}; font-weight: 700;">${point.violationType.replace(/_/g, ' ')}</span>
              </p>
              <p style="margin: 0; font-size: 13px; color: #374151;">
                <strong style="color: #1f2937;">Total Count:</strong> 
                <span style="font-weight: 700; font-size: 16px; color: #dc2626;">${point.count}</span>
              </p>
            </div>
          </div>
        `);

        markersRef.current.push(marker);
      });

      // Fit bounds to show all markers
      if (data.length > 0 && mapRef.current) {
        const bounds = L.latLngBounds(data.map((point: any) => [point.lat, point.lng]));
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [data, viewMode, isReady]);

  // Loading state
  if (!isReady) {
    return (
      <div className="rounded-xl border-2 border-[var(--color-border)] overflow-hidden shadow-lg">
        <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[var(--color-primary)] mx-auto mb-4"></div>
            <p className="text-theme-text font-semibold">Initializing map...</p>
            <p className="text-theme-muted text-sm mt-2">Waiting for Leaflet</p>
          </div>
        </div>
      </div>
    );
  }

  // No data state
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="rounded-xl border-2 border-[var(--color-border)] overflow-hidden shadow-lg">
        <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-theme-text font-semibold text-lg">No violation data available</p>
            <p className="text-theme-muted text-sm mt-2">Import challan data to visualize</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-[var(--color-border)] overflow-hidden shadow-lg">
      {/* Mode Toggle */}
      <div className="p-4 bg-gradient-to-r from-[var(--color-primary)]/5 to-transparent border-b-2 border-[var(--color-border)]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-lg font-bold text-theme-text mb-1">🗺️ India Violation Density Map</h3>
            <p className="text-xs text-theme-muted">
              {viewMode === 'category'
                ? 'Showing violations by category with color coding'
                : `India-wide ${heatPluginReady ? 'heatmap overlay' : 'markers'} showing ${data.length} hotspots`}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-theme-surface rounded-xl p-1 border-2 border-[var(--color-border)] shadow-sm">
            <button
              onClick={() => setViewMode('category')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                         ${
                           viewMode === 'category'
                             ? 'bg-[var(--color-primary)] text-white shadow-md'
                             : 'text-theme-muted hover:bg-theme-background'
                         }`}
            >
              <Layers className="h-4 w-4" />
              Category View
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                         ${
                           viewMode === 'heatmap'
                             ? 'bg-[var(--color-primary)] text-white shadow-md'
                             : 'text-theme-muted hover:bg-theme-background'
                         }`}
            >
              <Activity className="h-4 w-4" />
              Heatmap View
            </button>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-[600px] bg-gray-100" id="heatmap-container" />

      {/* Legend */}
      <div className="p-5 bg-theme-surface border-t-2 border-[var(--color-border)]">
        {viewMode === 'category' ? (
          <>
            <h4 className="text-sm font-bold text-theme-text mb-3 flex items-center gap-2">
              <div className="w-1 h-5 bg-[var(--color-primary)] rounded-full"></div>
              Violation Type Legend
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {Object.entries(violationColorMap)
                .filter(([type]) => Array.isArray(data) && data.some((d) => d.violationType === type))
                .map(([type, color]) => (
                  <div
                    key={type}
                    className="flex items-center gap-2 group cursor-pointer hover:bg-theme-background p-2 rounded-lg transition-colors"
                  >
                    <div
                      className="w-5 h-5 rounded-full border-2 border-white shadow-md group-hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs text-theme-text font-medium group-hover:text-[var(--color-primary)] transition-colors">
                      {type.replace(/_/g, ' ')}
                    </span>
                  </div>
                ))}
            </div>
          </>
        ) : (
          <>
            <h4 className="text-sm font-bold text-theme-text mb-3 flex items-center gap-2">
              <div className="w-1 h-5 bg-gradient-to-b from-blue-500 to-red-500 rounded-full"></div>
              {heatPluginReady ? 'Heatmap Overlay Intensity Scale' : 'Violation Markers (Heatmap Plugin Unavailable)'}
            </h4>
            {heatPluginReady ? (
              <>
                <div className="flex items-center gap-4 flex-wrap">
                  <div
                    className="flex-1 h-10 rounded-lg shadow-inner min-w-[200px] border-2 border-gray-200"
                    style={{
                      background:
                        'linear-gradient(to right, rgba(0, 0, 255, 0.0), rgba(0, 255, 255, 0.4), rgba(0, 255, 0, 0.5), rgba(255, 255, 0, 0.6), rgba(255, 128, 0, 0.75), rgba(255, 0, 0, 0.85))',
                    }}
                  ></div>
                  <div className="flex justify-between text-xs font-semibold text-theme-text gap-3">
                    <span className="bg-blue-100 text-blue-900 px-3 py-1.5 rounded-full border border-blue-300">🔵 Low</span>
                    <span className="bg-yellow-100 text-yellow-900 px-3 py-1.5 rounded-full border border-yellow-300">🟡 Medium</span>
                    <span className="bg-red-100 text-red-900 px-3 py-1.5 rounded-full border border-red-300">🔴 High</span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="text-xs text-theme-muted bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200">
                    💡 <strong className="text-blue-900 dark:text-blue-300">Zoom-Aware:</strong> Heatmap automatically adjusts radius and intensity as you zoom in/out for accurate visualization.
                  </div>
                  <div className="text-xs text-theme-muted bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200">
                    🔥 <strong className="text-orange-900 dark:text-orange-300">Hot Zones:</strong> Red zones indicate areas with highest violation counts requiring enforcement.
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-theme-muted bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-300">
                ⚠️ <strong>Note:</strong> Heatmap overlay plugin not loaded. Showing markers only. Check browser console for details.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
