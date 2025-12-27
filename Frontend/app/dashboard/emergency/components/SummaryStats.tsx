'use client';

import { motion , useReducedMotion } from 'framer-motion';
import type { Variants, Transition  } from 'framer-motion';
import { Activity, Clock, Ambulance, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { TrafficData } from './types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
};

const itemTransition: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 35,
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: itemTransition },
};

function StatCard({
  icon: Icon,
  label,
  value,
  subLabel,
  tintRgb,
  trend,
  delay = 0,
}: {
  icon: any;
  label: string;
  value: string | number;
  subLabel?: string;
  tintRgb: string; // "59, 130, 246"
  trend?: { direction: 'up' | 'down'; label: string };
  delay?: number;
}) {
  const reduceMotion = useReducedMotion();
  const TrendIcon = trend?.direction === 'down' ? TrendingDown : TrendingUp;
  const trendColor =
    trend?.direction === 'down' ? 'text-[var(--color-warning)]' : 'text-[var(--color-success)]';

  return (
    <motion.div
      variants={itemVariants}
      transition={{ delay }}
      whileHover={reduceMotion ? undefined : { y: -2, scale: 1.01 }}
      className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-theme-surface p-5 shadow-sm"
    >
      {/* subtle accent bar (only color; background stays same for all) */}
      <div
        aria-hidden="true"
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ backgroundColor: `rgb(${tintRgb})` }}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-theme-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-theme-text tabular-nums">{value}</p>
          {subLabel ? <p className="mt-1 text-xs text-theme-muted">{subLabel}</p> : null}
        </div>

        <div className="flex flex-col items-end gap-2">
          {/* icon chip */}
          <div
            className="rounded-xl border p-2"
            style={{
              borderColor: `rgba(${tintRgb},0.25)`,
              backgroundColor: `rgba(${tintRgb},0.10)`,
            }}
          >
            <Icon className="h-5 w-5" style={{ color: `rgb(${tintRgb})` }} />
          </div>

          {trend ? (
            <div className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-theme-surface px-2 py-1 text-[11px] font-semibold">
              <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
              <span className={trendColor}>{trend.label}</span>
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export default function SummaryStats({ data }: { data: TrafficData }) {
  const totalVehicles = data.traffic_data.reduce((sum, item) => sum + item.no_of_vehicles, 0);

  const avgWaitTime = data.traffic_data.length
    ? data.traffic_data.reduce((sum, item) => sum + item.avg_waiting_time, 0) / data.traffic_data.length
    : 0;

  const emergencyData = data.traffic_data.find((item) => item.vehicle_type === 'emergency');
  const emergencyCount = emergencyData?.no_of_vehicles || 0;

  const flowGood = avgWaitTime < 30;
  const flowTrend = flowGood
    ? { direction: 'up' as const, label: 'Smooth' }
    : { direction: 'down' as const, label: 'Congested' };

  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <StatCard
        icon={Activity}
        label="Total Vehicles"
        value={totalVehicles}
        subLabel="Across all categories"
        tintRgb="59, 130, 246"
        trend={flowTrend}
        delay={0}
      />

      <StatCard
        icon={Clock}
        label="Avg Wait Time"
        value={`${avgWaitTime.toFixed(1)}s`}
        subLabel="Network average"
        tintRgb="168, 85, 247"
        trend={flowTrend}
        delay={0.06}
      />

      <StatCard
        icon={Ambulance}
        label="Emergency"
        value={emergencyCount}
        subLabel="Priority vehicles"
        tintRgb="239, 68, 68"
        trend={emergencyCount > 0 ? { direction: 'up', label: 'Active' } : { direction: 'down', label: 'None' }}
        delay={0.12}
      />

      <StatCard
        icon={BarChart3}
        label="Vehicle Types"
        value={data.traffic_data.length}
        subLabel="Distinct categories"
        tintRgb="34, 197, 94"
        delay={0.18}
      />
    </motion.div>
  );
}
