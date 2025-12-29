// Vegha/app/dashboard/simulation/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import Card from '@/components/Card';
import {
  Activity,
  Car,
  Clock,
  TrafficCone,
  MapPin,
  Ambulance,
  AlertCircle,
  Gauge,
} from 'lucide-react';
import { NextRequest, NextResponse } from 'next/server';

// ✅ FIX: Use HTTPS for production (wss:// will be automatic)
const sumoServerUrl = process.env.NEXT_PUBLIC_SUMO_SERVER_URL || "https://api.vegha.vikasrajyadav.com";

interface SimulationMetrics {
  vehicleCount: number;
  avgSpeed: number;
  waiting: number;
  simTime: number;
  signals: number;
  avgWaitTime: number;
  congestionPercent: number;
  // ✅ NEW: Ambulance metrics
  ambWaiting: number;
  ambCount: number;
  ambSpeed: number;
}

export default function SimulationPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  
  const [metrics, setMetrics] = useState<SimulationMetrics>({
    vehicleCount: 0,
    avgSpeed: 0,
    waiting: 0,
    simTime: 0,
    signals: 0,
    avgWaitTime: 0.0,
    congestionPercent: 0,
    // ✅ NEW: Initialize ambulance metrics
    ambWaiting: 0,
    ambCount: 0,
    ambSpeed: 0
  });

  useEffect(() => {
    // Initialize Socket.IO connection with the correct URL
    const socketInstance = io(sumoServerUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      secure: true,
      reconnectionAttempts: 5
    });

    socketInstance.on('connect', () => {
      console.log('Connected to SUMO backend via Socket.IO');
      setIsConnected(true);
      setIsLoading(false);
    });

    socketInstance.on('disconnect', () => {
      console.log('Disconnected from SUMO backend');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (err) => {
      console.error('Socket.IO connection error:', err);
      setError('Failed to connect to simulation server. Check if the backend is running.');
      setIsLoading(false);
    });

    // ✅ UPDATED: Listen for simulation updates with ambulance metrics
    socketInstance.on('update', (data: any) => {
      setMetrics({
        vehicleCount: Object.keys(data.vehicles || {}).length,
        avgSpeed: data.avg_speed || 0,
        waiting: data.waiting || 0,
        simTime: data.time || 0,
        signals: Object.keys(data.traffic_lights || {}).length,
        avgWaitTime: data.avg_wait_time || 0.0,
        congestionPercent: data.congestion_percent || 0,
        // ✅ NEW: Extract ambulance metrics from socket data
        ambWaiting: data.amb_waiting || 0,
        ambCount: data.amb_count || 0,
        ambSpeed: data.amb_avg_speed || 0
      });
    });

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen">
    
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-blue-600 dark:text-blue-500">
            Vegha Traffic Simulation
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2 flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            Real-time SUMO traffic simulation with live metrics
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          className="px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-all duration-300 shadow-sm hover:shadow-md font-medium"
        >
          Refresh
        </button>
      </div>

      {/* SUMO Simulation Iframe Container */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm dark:shadow-md overflow-hidden mb-6 h-[calc(100vh-200px)]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 dark:border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Connecting to Simulation Server...
              </p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-red-500">
              <p className="text-2xl mb-2">⚠️ Connection Error</p>
              <p className="text-gray-600 dark:text-gray-400">{error}</p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <iframe
            src={sumoServerUrl}
            className="w-full h-full border-0"
            title="SUMO Traffic Simulation"
            allow="fullscreen"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        )}
      </div>

      {/* Simulation Statistics Section */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          Simulation Statistics
        </h2>
      </div>

      {/* Metrics Cards Grid - Now with 8 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
        
        <Card
          title="Simulation Step"
          value={metrics.simTime}
          icon={Activity}
          iconBgColor="bg-gradient-to-br from-blue-600 to-blue-700"
          subtitle="Current simulation step"
          status={{ text: isConnected ? 'Live' : 'Disconnected', color: isConnected ? 'text-green-500' : 'text-gray-600 dark:text-gray-400', dotColor: isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500' }}
        />
        
        <Card
          title="Total Vehicles"
          value={metrics.vehicleCount}
          icon={Car}
          iconBgColor="bg-gradient-to-br from-purple-500 to-purple-600"
          subtitle="Active vehicles in simulation"
          status={{ text: isConnected ? 'Live count' : 'Static', color: isConnected ? 'text-green-500' : 'text-gray-600 dark:text-gray-400', dotColor: isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500' }}
        />
        
        <Card
          title="Waiting Vehicles"
          value={metrics.waiting}
          icon={TrafficCone}
          iconBgColor="bg-gradient-to-br from-amber-400 to-amber-500"
          subtitle="Vehicles waiting at signals"
          status={{ text: isConnected ? 'Real-time' : 'Calculated', color: isConnected ? 'text-green-500' : 'text-gray-600 dark:text-gray-400', dotColor: isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500' }}
        />
        
        <Card
          title="Average Speed"
          value={`${metrics.avgSpeed.toFixed(1)} km/h`}
          icon={Clock}
          iconBgColor="bg-gradient-to-br from-green-500 to-green-600"
          subtitle="Mean vehicle speed"
          status={{ text: isConnected ? 'Real-time' : 'Calculated', color: isConnected ? 'text-green-500' : 'text-gray-600 dark:text-gray-400', dotColor: isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500' }}
        />
        
        <Card
          title="Total Signals"
          value={metrics.signals}
          icon={MapPin}
          iconBgColor="bg-gradient-to-br from-teal-500 to-teal-600"
          subtitle="Traffic signals in network"
          status={{ text: 'Network total', color: 'text-gray-600 dark:text-gray-400', dotColor: 'bg-gray-500' }}
        />

        {/* ✅ NEW: Ambulance Metrics Cards */}
        <Card
          title="Amb. Waiting"
          value={metrics.ambWaiting}
          icon={AlertCircle}
          iconBgColor="bg-gradient-to-br from-red-500 to-red-600"
          subtitle="Ambulances waiting at signals"
          status={{ 
            text: metrics.ambWaiting > 0 ? 'CRITICAL' : 'Normal', 
            color: metrics.ambWaiting > 0 ? 'text-red-500 font-bold' : 'text-green-500', 
            dotColor: metrics.ambWaiting > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500' 
          }}
        />

        <Card
          title="Amb. Total"
          value={metrics.ambCount}
          icon={Ambulance}
          iconBgColor="bg-gradient-to-br from-orange-500 to-orange-600"
          subtitle="Total ambulances in network"
          status={{ 
            text: isConnected ? 'Live count' : 'Static', 
            color: isConnected ? 'text-green-500' : 'text-gray-600 dark:text-gray-400', 
            dotColor: isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500' 
          }}
        />

        <Card
          title="Amb. Avg Speed"
          value={`${metrics.ambSpeed.toFixed(1)} km/h`}
          icon={Gauge}
          iconBgColor="bg-gradient-to-br from-cyan-500 to-cyan-600"
          subtitle="Average ambulance speed"
          status={{ 
            text: metrics.ambSpeed > 0 ? 'Moving' : 'Idle', 
            color: metrics.ambSpeed > 0 ? 'text-green-500' : 'text-gray-600 dark:text-gray-400', 
            dotColor: metrics.ambSpeed > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-500' 
          }}
        />
      </div>

      {/* Connection Info Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm dark:shadow-md">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-lg">
              Connection Information
            </h3>
            <div className="gap-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Endpoint:</span>
                <code className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded text-gray-900 dark:text-gray-100 text-sm font-mono">
                  {sumoServerUrl} 
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`px-3 py-1 rounded text-sm font-medium ${isConnected ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}`}>
                  {isConnected ? '● Connected' : '● Disconnected'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Protocol:</span>
                <span className="text-gray-700 dark:text-gray-300 text-sm">Socket.IO • Real-time updates enabled</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              Make sure SUMO server is running on the backend. Metrics update in real-time via WebSocket connection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
