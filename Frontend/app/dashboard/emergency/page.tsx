'use client';

import { Suspense } from 'react';
import { motion } from 'framer-motion';
import TrafficContent from './components/TrafficContent';
import TrafficSkeleton from './components/TrafficSkeleton';

export default function EmergencyPage() {
  return (
    <div className="min-h-screen vegah-page mb-2">
      <div className="max-w-screen container">
        {/* Sticky, visually separated header */}
        <motion.div
          className="sticky top-0 z-20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          style={{ background: 'rgba(var(--color-primary-500-rgb), 0.00)' }}
        >
          <div
            className="relative bg-[var(--color-bg)]/72 backdrop-blur-xl"
            style={{
              boxShadow:
                'inset 0 -1px 0 rgba(0,0,0,0.08), inset 0 -2px 0 rgba(var(--color-primary-500-rgb),0.08)',
            }}
          >
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(var(--color-primary-500-rgb),0.22), transparent)',
              }}
            />

            <div className="  py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <motion.h1
                    className="text-lg sm:text-xl font-semibold vegah-heading text-[var(--color-text)] tracking-tight leading-tight"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    Traffic Management Dashboard
                  </motion.h1>

                  <motion.p
                    className="mt-0.5 text-xs sm:text-sm text-[var(--color-text-muted)] truncate"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    Real-time traffic monitoring and vehicle analytics
                  </motion.p>
                </div>

                <motion.div
                  className="flex items-center gap-2 px-3 py-1.5 bg-theme-surface rounded-full border border-[var(--color-border)] shadow-sm vegah-badge flex-shrink-0"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  whileHover={{ scale: 1.03 }}
                >
                  <motion.div
                    className="w-2 h-2 bg-[var(--color-success)] rounded-full vegah-badge-live"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                  <span className="text-xs sm:text-sm font-medium text-[var(--color-text-muted)] vegah-badge-text">
                    Live
                  </span>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Spacer so content never sits under sticky header */}
        <div className="h-4 sm:h-6" />

        <Suspense fallback={<TrafficSkeleton />}>
          <TrafficContent />
        </Suspense>
      </div>
    </div>
  );
}
