'use client';

import React from 'react';
import { TrafficData, TrafficVehicleData } from './types';
import {
  Car,
  Bus,
  Ambulance,
  CheckCircle,
  Timer,
  AlertCircle
} from 'lucide-react';

export async function getTrafficData(): Promise<TrafficData> {
  try {
    const response = await fetch('/api/traffic-data');
    if (!response.ok) throw new Error('Failed to fetch traffic data');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching traffic data:', error);
    return { traffic_data: [] };
  }
}

export function getVehicleIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'private':
      return <Car className="w-6 h-6" />;
    case 'public':
      return <Bus className="w-6 h-6" />;
    case 'emergency':
      return <Ambulance className="w-6 h-6" />;
    default:
      return <Car className="w-6 h-6" />;
  }
}

export function getVehicleColor(type: string) {
  switch (type.toLowerCase()) {
    case 'private':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-700 dark:text-blue-300',
        icon: 'text-blue-600 dark:text-blue-400',
        gradient: 'from-blue-500 to-blue-600',
        bar: 'bg-blue-500',
        chartColor: '#3B82F6',
        lightColor: '#DBEAFE'
      };
    case 'public':
      return {
        bg: 'bg-green-50 dark:bg-green-900/20',
        border: 'border-green-200 dark:border-green-800',
        text: 'text-green-700 dark:text-green-300',
        icon: 'text-green-600 dark:text-green-400',
        gradient: 'from-green-500 to-green-600',
        bar: 'bg-green-500',
        chartColor: '#10B981',
        lightColor: '#DCFCE7'
      };
    case 'emergency':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-300',
        icon: 'text-red-600 dark:text-red-400',
        gradient: 'from-red-500 to-red-600',
        bar: 'bg-red-500',
        chartColor: '#EF4444',
        lightColor: '#FEE2E2'
      };
    default:
      return {
        bg: 'bg-gray-50 dark:bg-gray-900/20',
        border: 'border-gray-200 dark:border-gray-800',
        text: 'text-gray-700 dark:text-gray-300',
        icon: 'text-gray-600 dark:text-gray-400',
        gradient: 'from-gray-500 to-gray-600',
        bar: 'bg-gray-500',
        chartColor: '#6B7280',
        lightColor: '#F3F4F6'
      };
  }
}

export function getWaitTimeStatus(waitTime: number) {
  if (waitTime <= 20) {
    return { icon: CheckCircle, color: 'text-green-500', label: 'Excellent', bg: 'bg-green-100 dark:bg-green-900/30' };
  } else if (waitTime <= 35) {
    return { icon: Timer, color: 'text-yellow-500', label: 'Moderate', bg: 'bg-yellow-100 dark:bg-yellow-900/30' };
  } else {
    return { icon: AlertCircle, color: 'text-red-500', label: 'High', bg: 'bg-red-100 dark:bg-red-900/30' };
  }
}

export type { TrafficData, TrafficVehicleData };