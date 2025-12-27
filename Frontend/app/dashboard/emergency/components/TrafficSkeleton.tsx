'use client';

import { motion } from 'framer-motion';

export default function TrafficSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <motion.div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <motion.div className="animate-pulse space-y-4" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded w-12" />
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24" />
              <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16" />
            </motion.div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}