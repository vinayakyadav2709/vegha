'use client';

import { motion } from 'framer-motion';
import { Users, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import AnimatedProgressBar from './AnimatedProgressBar';
import { TrafficVehicleData } from './types';
import { getVehicleColor, getVehicleIcon, getWaitTimeStatus } from './utils.client';

const cardVariants = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' as any },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)' as any,
    transition: { type: 'spring', stiffness: 160, damping: 18 },
  },
};

export default function VehicleTypeCard({ data, index }: { data: TrafficVehicleData; index: number }) {
  const colors = getVehicleColor(data.vehicle_type);
  const waitStatus = getWaitTimeStatus(data.avg_waiting_time);
  const StatusIcon = waitStatus.icon;

  const flowGood = data.avg_waiting_time < 30;

  // Use vehicle chartColor as the tint source (dynamic bg)
  const tint = colors.chartColor; // expected like "#xxxxxx" or "rgb(...)"
  const bgStyle: React.CSSProperties = {
    background: `
      radial-gradient(900px circle at 20% 10%, ${tint}22, transparent 55%),
      radial-gradient(700px circle at 85% 30%, ${tint}18, transparent 50%),
      linear-gradient(180deg, rgba(var(--color-primary-500-rgb),0.06), transparent 55%)
    `,
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -4, scale: 1.01 }}
      className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-theme-surface shadow-sm"
      style={bgStyle}
    >
      {/* Animated orb */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-2xl opacity-40"
        style={{ backgroundColor: tint }}
        animate={{ x: [0, -10, 0], y: [0, 8, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Fine grain / sheen */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background:
            'linear-gradient(120deg, transparent 0%, rgba(255,255,255,0.08) 30%, transparent 60%)',
        }}
        animate={{ x: ['-30%', '120%'] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative p-6">
        {/* Header layout (less boring) */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <motion.div
              className="h-12 w-12 rounded-2xl border flex items-center justify-center"
              style={{
                borderColor: 'rgba(var(--color-primary-500-rgb),0.18)',
                backgroundColor: 'rgba(var(--color-primary-500-rgb),0.06)',
              }}
              whileHover={{ rotate: -4 }}
              transition={{ type: 'spring', stiffness: 220, damping: 18 }}
            >
              <motion.div
                className={colors.icon}
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {getVehicleIcon(data.vehicle_type)}
              </motion.div>
            </motion.div>

            <div className="min-w-0">
              <div className="text-xs font-semibold tracking-wide text-theme-muted">Category</div>
              <div className="mt-1 flex items-center gap-2 min-w-0">
                <h3 className="text-base font-semibold text-theme-text capitalize truncate">
                  {data.vehicle_type}
                </h3>
                <span
                  className="hidden sm:inline-flex h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: tint }}
                />
              </div>
        
            </div>
          </div>

          {/* Status pill */}
          <div
            className="shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1"
            style={{
              borderColor: 'rgba(var(--color-primary-500-rgb),0.18)',
              backgroundColor: 'rgba(var(--color-primary-500-rgb),0.06)',
            }}
          >
            <StatusIcon className={`h-4 w-4 ${waitStatus.color}`} />
            <span className={`text-xs font-semibold ${waitStatus.color}`}>{waitStatus.label}</span>
          </div>
        </div>

        {/* Metrics (split into blocks) */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div
            className="rounded-2xl border border-[rgba(var(--color-primary-500-rgb),0.14)]
                       bg-[rgba(var(--color-primary-500-rgb),0.04)] p-4"
            whileHover={{ y: -1 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-theme-muted">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Active</span>
              </div>
              <span className="text-xl font-semibold text-theme-text tabular-nums">{data.no_of_vehicles}</span>
            </div>
            <div className="mt-3">
              <AnimatedProgressBar
                percentage={Math.min((data.no_of_vehicles / 150) * 100, 100)}
                color={colors.bar}
                delay={index * 0.05 + 0.1}
              />
            </div>
          </motion.div>

          <motion.div
            className="rounded-2xl border border-[rgba(var(--color-primary-500-rgb),0.14)]
                       bg-[rgba(var(--color-primary-500-rgb),0.04)] p-4"
            whileHover={{ y: -1 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-theme-muted">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Avg wait</span>
              </div>
              <span className="text-lg font-semibold text-theme-text tabular-nums">
                {data.avg_waiting_time.toFixed(1)}s
              </span>
            </div>
            <div className="mt-3">
              <AnimatedProgressBar
                percentage={Math.min((data.avg_waiting_time / 60) * 100, 100)}
                color={colors.bar}
                delay={index * 0.05 + 0.15}
              />
            </div>
          </motion.div>
        </div>

        {/* Footer strip (structure upgrade) */}
        <div className="mt-4 rounded-2xl border border-[var(--color-border)] bg-theme-surface/50 px-4 py-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-theme-muted">Traffic flow</span>

            <motion.div
              className="inline-flex items-center gap-2"
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            >
              {flowGood ? (
                <>
                  <TrendingUp className="h-4 w-4 text-[var(--color-success)]" />
                  <span className="font-semibold text-[var(--color-success)]">Smooth</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-4 w-4 text-[var(--color-warning)]" />
                  <span className="font-semibold text-[var(--color-warning)]">Congested</span>
                </>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
