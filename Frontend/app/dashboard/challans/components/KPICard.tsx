'use client';

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  CheckCircle, 
  Clock, 
  XCircle,
  AlertTriangle,
  DollarSign,
  FileCheck,
  FileClock
} from 'lucide-react';

interface KPI {
  id: string;
  label: string;  // Changed from 'title' to 'label'
  value: number;
  icon?: string;
  format?: string;
  trend?: {
    direction: 'up' | 'down';
    percentage: number;
  };
}

interface KPICardProps {
  data: KPI;
  delay?: number;
}

// Icon mapping
const iconMap: Record<string, any> = {
  receipt: Receipt,
  'check-circle': CheckCircle,
  clock: Clock,
  'x-circle': XCircle,
  'alert-triangle': AlertTriangle,
  'dollar-sign': DollarSign,
  'file-check': FileCheck,
  'file-clock': FileClock,
  verified: CheckCircle,
  pending: Clock,
  refuted: XCircle,
  total: Receipt,
  warning: AlertTriangle,
  money: DollarSign,
};

// Color mapping
const colorMap: Record<string, string> = {
  total_challans: '59, 130, 246',
  verified_challans: '34, 197, 94',
  pending_verification: '251, 146, 60',
  refuted_challans: '239, 68, 68',
  total_revenue: '168, 85, 247',
  average_fine: '236, 72, 153',
  default: '59, 130, 246',
};

export default function KPICard({ data, delay = 0 }: KPICardProps) {
  // Safe icon lookup
  const Icon = (data.icon && iconMap[data.icon]) ? iconMap[data.icon] : Receipt;
  const tintRgb = colorMap[data.id] || colorMap.default;

  // Format value - ensure it's a number
  const formatValue = (value: number | undefined, format?: string): string => {
    const numValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    
    if (format === 'currency' || data.id.includes('revenue') || data.id.includes('fine')) {
      return `₹${numValue.toLocaleString('en-IN')}`;
    }
    return numValue.toLocaleString('en-IN');
  };

  // Safe trend extraction
  const hasTrend = data.trend && data.trend.percentage > 0;
  const trendDirection = data.trend?.direction || 'up';
  const trendPercentage = data.trend?.percentage || 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-[var(--color-border)] bg-theme-surface p-6 shadow-md transition-all duration-300 hover:shadow-xl hover:scale-[1.02] hover:border-[var(--color-primary)]"
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, rgb(${tintRgb}), transparent 70%)`,
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-4">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
              {data.label || 'Unknown'}
            </p>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white truncate">
              {formatValue(data.value, data.format)}
            </h3>
          </div>

          {/* Icon */}
          <div
            className="p-3 rounded-xl shadow-lg flex-shrink-0"
            style={{
              backgroundColor: `rgba(${tintRgb}, 0.1)`,
              border: `2px solid rgba(${tintRgb}, 0.2)`,
            }}
          >
            <Icon
              className="h-6 w-6"
              style={{ color: `rgb(${tintRgb})` }}
            />
          </div>
        </div>

        {/* Trend indicator */}
        {hasTrend && (
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                trendDirection === 'up' 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {trendDirection === 'up' ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : (
                <TrendingDown className="h-3.5 w-3.5" />
              )}
              <span>{trendPercentage}%</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">vs last month</span>
          </div>
        )}
      </div>

      {/* Bottom accent bar */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(90deg, rgb(${tintRgb}), transparent)`,
        }}
      />
    </div>
  );
}
