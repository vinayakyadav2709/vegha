'use client';

import { motion } from 'framer-motion';

export default function AnimatedProgressBar({
  percentage,
  color,
  delay = 0,
}: {
  percentage: number;
  color: string;
  delay?: number;
}) {
  return (
    <div className="w-full rounded-full h-2 overflow-hidden border border-[rgba(var(--color-primary-500-rgb),0.18)]
                    bg-[rgba(var(--color-primary-500-rgb),0.08)]">
      <motion.div
        className={`${color} h-2 rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 1.2, delay, ease: 'easeOut' }}
      />
    </div>
  );
}
