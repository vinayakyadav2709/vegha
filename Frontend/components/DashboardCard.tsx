'use client';

import { Suspense, useState, useEffect } from 'react'
import { useTheme } from 'next-themes'
import { 
  Activity, 
  MapPin, 
  Car, 
  Truck, 
  Calendar, 
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  BarChart3
} from 'lucide-react'
import { getDashboard, formatWaitTime, getCongestionColor, getAlertColor } from '@/lib/api'
import Card from './Card'
import { GRADIENT_DARK, GRADIENT_LIGHT } from './ui'

// Enhanced Loading component
function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg w-64 animate-pulse"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-96 animate-pulse"></div>
      </div>

      {/* System Status Skeleton with shimmer effect */}
      <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-slate-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded-full animate-pulse"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse"></div>
            <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 rounded w-48 animate-pulse"></div>
          </div>
        </div>
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-16 animate-pulse"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Main Dashboard Component
function DashboardContent() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const d = await getDashboard();
        if (mounted) setData(d);
      } catch (e) {
        console.error('Failed to load dashboard data', e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const getStatusIcon = () => {
    if (!data) return <Activity className="w-8 h-8 text-gray-500" />;
    switch (data.system_status) {
      case 'operational':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-yellow-500" />;
      case 'critical':
        return <XCircle className="w-8 h-8 text-red-500" />;
      default:
        return <Activity className="w-8 h-8 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    if (!data) return 'text-gray-600 dark:text-gray-400';
    switch (data.system_status) {
      case 'operational':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusBg = () => {
    if (!data) return 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border-gray-200 dark:border-gray-700';
    switch (data.system_status) {
      case 'operational':
        return 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800';
      case 'warning':
        return 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800';
      case 'critical':
        return 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800';
      default:
        return 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border-gray-200 dark:border-gray-700';
    }
  };

  if (loading || !data) return <DashboardSkeleton />;

  // Calculate operational percentage
  const operationalPercentage = Math.round((data.traffic_overview.active_junctions / data.traffic_overview.total_junctions) * 100);

  // Build an array of card definitions and render via map
  const statusCards = [
    {
      key: 'total-junctions',
      title: 'Total Junctions',
      value: data.traffic_overview.total_junctions,
      icon: MapPin,
      iconBgColor: 'bg-gradient-to-br from-blue-500 to-blue-600',
      subtitle: 'Monitoring all',
      badge: {
        text: '📊',
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-100 dark:bg-blue-900'
      }
    },
    {
      key: 'active-junctions',
      title: 'Active Junctions',
      value: data.traffic_overview.active_junctions,
      icon: Activity,
      iconBgColor: 'bg-gradient-to-br from-green-500 to-emerald-600',
      status: {
        text: `${operationalPercentage}% operational`,
        color: 'text-green-600 dark:text-green-400',
        dotColor: 'bg-green-500 animate-pulse'
      },
      badge: {
        text: '⚡',
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-100 dark:bg-green-900'
      }
    },
    {
      key: 'avg-congestion',
      title: 'Avg Congestion',
      value: data.traffic_overview.average_congestion,
      icon: Car,
      iconBgColor: 'bg-gradient-to-br from-orange-500 to-red-500',
      subtitle: 'City-wide average',
      status: {
        text: 'City-wide average',
        color: 'text-gray-500 dark:text-gray-400',
        dotColor:
          data.traffic_overview.average_congestion === 'light'
            ? 'bg-green-500'
            : data.traffic_overview.average_congestion === 'moderate'
            ? 'bg-yellow-500'
            : 'bg-red-500'
      }
    },
    {
      key: 'total-vehicles',
      title: 'Total Vehicles',
      value: data.current_metrics.total_vehicles.toLocaleString(),
      icon: Car,
      iconBgColor: 'bg-gradient-to-br from-purple-500 to-indigo-600',
      trend: {
        value: '+5.2% vs yesterday',
        isPositive: true,
        icon: TrendingUp
      }
    },
    {
      key: 'emergency-vehicles',
      title: 'Emergency Vehicles',
      value: data.current_metrics.emergency_vehicles,
      icon: Truck,
      iconBgColor: 'bg-gradient-to-br from-red-500 to-pink-600',
      status: {
        text: 'Active responses',
        color: 'text-red-600 dark:text-red-400',
        dotColor: 'bg-red-500 animate-pulse'
      },
      badge:
        data.current_metrics.emergency_vehicles > 0
          ? {
              text: data.current_metrics.emergency_vehicles.toString(),
              color: 'text-red-600 dark:text-red-400',
              bgColor: 'bg-red-100 dark:bg-red-900'
            }
          : undefined
    },
    {
      key: 'active-events',
      title: 'Active Events',
      value: data.current_metrics.active_events,
      icon: Calendar,
      iconBgColor: 'bg-gradient-to-br from-purple-500 to-violet-600',
      subtitle: 'Ongoing incidents'
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Enhanced System Status Card */}
      <div className={`rounded-xl border p-8 shadow-lg hover:shadow-xl transition-all duration-300 ${getStatusBg()}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {getStatusIcon()}
              {data.system_status === 'operational' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              )}
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">System Status</h2>
              <p className={`text-3xl font-bold capitalize ${getStatusColor()}`}>
                {data.system_status}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Last updated: {new Date().toLocaleTimeString('en-IN', { hour12: true })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{operationalPercentage}%</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Operational</div>
            <div className="flex items-center justify-end mt-1">
              {operationalPercentage > 90 ? (
                <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
              )}
              <span className="text-xs text-gray-500">vs yesterday</span>
            </div>
          </div>
        </div>
      </div>

      {/* Render cards from array */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statusCards.map((card) => (
          <Card
            key={card.key}
            title={card.title}
            value={card.value}
            icon={card.icon}
            iconBgColor={card.iconBgColor}
            subtitle={card.subtitle}
            status={card.status}
            badge={card.badge}
            trend={card.trend}
          />
        ))}
      </div>

      {/* Enhanced Wait Time Card */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-8 shadow-lg hover:shadow-xl transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Average Wait Time</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-white mt-1">
                {formatWaitTime(data.current_metrics.average_wait_time_sec)}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Across all monitored junctions
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
              {Math.round(data.current_metrics.average_wait_time_sec / 60 * 10) / 10} min
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Per vehicle</div>
          </div>
        </div>
      </div>

      {/* Enhanced Alerts Panel */}
      <div className="card card-hover p-8">
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-xl font-semibold text-theme-text">System Alerts</h3>

    <div className="flex items-center gap-2">
      {/* “Live updates” indicator (token-driven, subtle) */}
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: 'var(--color-error)' }}
      />
      <span className="text-sm text-theme-muted">Live updates</span>
    </div>
  </div>

  <div className="space-y-4">
    {data.alerts.length === 0 ? (
      <div className="text-center py-10 surface">
        <div className="mx-auto w-14 h-14 rounded-2xl flex items-center justify-center muted-bg">
          <CheckCircle
            className="w-8 h-8"
            style={{ color: 'var(--color-success)' }}
          />
        </div>

        <p className="mt-4 text-theme-text font-medium">No active alerts</p>
        <p className="text-sm text-theme-muted mt-1">
          All systems operating normally
        </p>
      </div>
    ) : (
      data.alerts.map((alert: Alert, index: number) => {
        // token-driven appearance (no Tailwind hardcoded colors)
        const typeMeta =
          alert.type === 'critical'
            ? {
                icon: XCircle,
                tone: 'var(--severity-critical)',
                tint: 'var(--severity-critical-soft)',
                border: 'var(--severity-critical-bg)',
                label: 'Critical',
              }
            : alert.type === 'warning'
            ? {
                icon: AlertTriangle,
                tone: 'var(--severity-high)',
                tint: 'var(--severity-high-soft)',
                border: 'var(--severity-high-bg)',
                label: 'Warning',
              }
            : {
                icon: CheckCircle,
                tone: 'var(--color-primary)',
                tint: 'var(--color-primary-soft)',
                border: 'var(--color-border)',
                label: 'Info',
              };

        const Icon = typeMeta.icon;

        return (
          <div
            key={index}
            className="rounded-xl p-5 transition-transform duration-200"
            style={{
              border: '1px solid',
              borderColor: typeMeta.border,
              backgroundImage: `linear-gradient(90deg, ${typeMeta.tint}, transparent 70%)`,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  backgroundColor: typeMeta.tint,
                  boxShadow: '0 8px 20px rgba(2,6,23,0.08)',
                }}
              >
                <Icon className="w-5 h-5" style={{ color: typeMeta.tone }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="text-sm font-semibold text-theme-text tracking-wide">
                    {typeMeta.label} Alert
                  </span>
                  <span className="text-xs text-theme-muted">
                    {new Date().toLocaleTimeString('en-IN', { hour12: true })}
                  </span>
                </div>

                <p className="text-sm leading-relaxed text-theme-muted">
                  {alert.message}
                </p>
              </div>
            </div>
          </div>
        );
      })
    )}
  </div>
</div>

    </div>
  );
}

// Main Page Component
export default function Dashboard() {
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted && theme === 'dark'

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ background: isDark ? GRADIENT_DARK : GRADIENT_LIGHT }}
    >
      <div className="">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Traffic Management Dashboard</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time monitoring and analytics for your traffic management system
          </p>
        </div>
        
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />  
        </Suspense>
      </div>
    </div>
  )
}

type Alert = {
  id: string;
  type: 'critical' | 'high' | 'medium' | 'low' | 'warning';
  message: string;
  title?: string;
  timestamp?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
  resolved?: boolean;
};