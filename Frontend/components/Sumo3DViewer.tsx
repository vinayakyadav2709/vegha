// Vegha/components/Sumo3DViewer.tsx (complete fixed version)
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

interface Vehicle {
  id: string;
  x: number;
  y: number;
  speed: number;
  color: string;
}

interface Junction {
  id: string;
  x: number;
  y: number;
  phase: string;
  active: boolean;
}

interface SimulationStats {
  step: number;
  totalVehicles: number;
  avgSpeed: number;
}

const VehicleComponent: React.FC<{ vehicle: Vehicle }> = ({ vehicle }) => {
  return (
    <mesh position={[vehicle.x, vehicle.y, 1]}>
      <boxGeometry args={[3, 1.5, 1]} />
      <meshStandardMaterial color={vehicle.color} />
    </mesh>
  );
};

const JunctionComponent: React.FC<{ junction: Junction }> = ({ junction }) => {
  const getPhaseColor = (phase: string) => {
    switch (phase.toLowerCase()) {
      case 'g': return '#00ff00';
      case 'y': return '#ffff00';
      case 'r': return '#ff0000';
      default: return '#888888';
    }
  };

  return (
    <group position={[junction.x, junction.y, 0]}>
      <mesh>
        <cylinderGeometry args={[2, 2, 0.5]} />
        <meshStandardMaterial color={getPhaseColor(junction.phase)} />
      </mesh>
      <Text
        position={[0, 0, 1]}
        fontSize={1}
        color="black"
        anchorX="center"
        anchorY="middle"
      >
        {junction.id}
      </Text>
    </group>
  );
};

export default function Sumo3DViewer() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [junctions, setJunctions] = useState<Junction[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [simulationStats, setSimulationStats] = useState<SimulationStats>({
    step: 0,
    totalVehicles: 0,
    avgSpeed: 0
  });
  const wsRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Connect to SUMO WebSocket
    connectToSumo();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const connectToSumo = () => {
    try {
      const ws = new WebSocket('ws://localhost:8080');
      
      ws.onopen = () => {
        console.log('Connected to SUMO WebSocket');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'vehicle_update') {
            setVehicles(data.vehicles);
          } else if (data.type === 'junction_update') {
            setJunctions(data.junctions);
          } else if (data.type === 'simulation_stats') {
            setSimulationStats(data.stats);
          }
        } catch (error) {
          console.error('Error parsing WebSocket data:', error);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from SUMO WebSocket');
        setIsConnected(false);
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect...');
          connectToSumo();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  };

  const startSimulation = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'start_simulation' }));
    }
  };

  const pauseSimulation = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'pause_simulation' }));
    }
  };

  const resetSimulation = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'reset_simulation' }));
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Control Panel */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {isConnected ? 'Connected to SUMO' : 'Disconnected'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={startSimulation}
              className="px-4 py-2 bg-green-500 dark:bg-green-500 text-white rounded-lg hover:bg-green-600 dark:hover:bg-green-600 transition-colors disabled:opacity-50"
              disabled={!isConnected}
            >
              Start
            </button>
            <button
              onClick={pauseSimulation}
              className="px-4 py-2 bg-amber-400 dark:bg-amber-400 text-white rounded-lg hover:bg-amber-500 dark:hover:bg-amber-500 transition-colors disabled:opacity-50"
              disabled={!isConnected}
            >
              Pause
            </button>
            <button
              onClick={resetSimulation}
              className="px-4 py-2 bg-red-500 dark:bg-red-500 text-white rounded-lg hover:bg-red-600 dark:hover:bg-red-600 transition-colors disabled:opacity-50"
              disabled={!isConnected}
            >
              Reset
            </button>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            Step: {simulationStats.step} | Vehicles: {simulationStats.totalVehicles} | Avg Speed: {simulationStats.avgSpeed.toFixed(1)} m/s
          </div>
        </div>
      </div>

      {/* 3D Visualization */}
      <div ref={containerRef} className="flex-1">
        <Canvas
          camera={{ position: [0, 0, 100], fov: 60 }}
          style={{ width: '100%', height: '100%' }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[10, 10, 10]} intensity={0.8} />
          
          {/* Ground plane */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]}>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color="#f0f0f0" />
          </mesh>

          {/* Grid lines */}
          {Array.from({ length: 21 }, (_, i) => {
            const pos = i * 10 - 100;
            return (
              <group key={i}>
                <mesh position={[pos, 0, -9.9]}>
                  <planeGeometry args={[200, 0.1]} />
                  <meshStandardMaterial color="#e0e0e0" />
                </mesh>
                <mesh position={[0, pos, -9.9]}>
                  <planeGeometry args={[0.1, 200]} />
                  <meshStandardMaterial color="#e0e0e0" />
                </mesh>
              </group>
            );
          })}

          {/* Junction traffic lights */}
          {junctions.map((junction) => (
            <JunctionComponent key={junction.id} junction={junction} />
          ))}

          {/* Vehicles */}
          {vehicles.map((vehicle) => (
            <VehicleComponent key={vehicle.id} vehicle={vehicle} />
          ))}

          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        </Canvas>
      </div>
    </div>
  );
}