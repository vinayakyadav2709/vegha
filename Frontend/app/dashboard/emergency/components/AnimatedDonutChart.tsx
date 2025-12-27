'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart } from 'lucide-react';
import { TrafficVehicleData } from './types';
import { getVehicleColor } from './utils.client';

export default function AnimatedDonutChart({
  data,
  title,
  metric,
  delay = 0,
}: {
  data: TrafficVehicleData[];
  title: string;
  metric: 'no_of_vehicles' | 'avg_waiting_time';
  delay?: number;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = data.reduce((sum, item) => sum + item[metric], 0) || 0;
  const chartData = data.map((item, index) => ({
    ...item,
    percentage: total === 0 ? 0 : (item[metric] / total) * 100,
    index,
  }));

  let currentAngle = -90;
  const radius = 60;
  const innerRadius = 40;

  const polarToCartesian = (angle: number, r: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: Math.cos(rad) * r, y: Math.sin(rad) * r };
  };

  const createPath = (startAngle: number, endAngle: number) => {
    const start = polarToCartesian(startAngle, radius);
    const end = polarToCartesian(endAngle, radius);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    const innerStart = polarToCartesian(startAngle, innerRadius);
    const innerEnd = polarToCartesian(endAngle, innerRadius);

    return [
      `M ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
      'Z',
    ].join(' ');
  };

  const segments = chartData.map((item) => {
    const segAngle = (item.percentage / 100) * 360;
    const start = currentAngle;
    const end = currentAngle + segAngle;
    currentAngle = end;
    return { ...item, startAngle: start, endAngle: end, segmentAngle: segAngle };
  });

  return (
    <motion.div
      className="bg-theme-surface rounded-2xl border border-[var(--color-border)] p-6 shadow-sm"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <motion.h3
        className="text-base font-semibold text-theme-text mb-5 flex items-center gap-2"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: delay + 0.15 }}
      >
        <PieChart className="w-4 h-4 text-theme-muted" />
        <span>{title}</span>
      </motion.h3>

      <div className="flex flex-col lg:flex-row items-center justify-center gap-10">
        {/* Chart */}
        <motion.svg
          width="260"
          height="260"
          viewBox="-100 -100 200 200"
          className="text-theme-text" // makes fill-current inherit theme text color [web:1290]
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.5 }}
        >
          <circle
            cx="0"
            cy="0"
            r={radius}
            fill="none"
            stroke="rgba(var(--color-primary-500-rgb),0.18)"
            strokeWidth="2"
          />

          {segments.map((segment, index) => {
            const colors = getVehicleColor(segment.vehicle_type);
            const isHovered = hoveredIndex === index;

            return (
              <motion.g
                key={`seg-${index}`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="cursor-pointer"
              >
                <motion.path
                  d={createPath(segment.startAngle, segment.endAngle)}
                  fill={colors.chartColor}
                  animate={{ opacity: isHovered ? 1 : 0.82 }}
                  transition={{ duration: 0.15 }}
                  style={{ filter: isHovered ? 'brightness(1.12)' : 'brightness(1)' }}
                />

                {isHovered && (
                  <motion.g
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    <text
                      x={polarToCartesian(
                        segment.startAngle + segment.segmentAngle / 2,
                        (radius + innerRadius) / 2
                      ).x}
                      y={polarToCartesian(
                        segment.startAngle + segment.segmentAngle / 2,
                        (radius + innerRadius) / 2
                      ).y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-white font-semibold text-[12px]"
                      style={{ pointerEvents: 'none' }}
                    >
                      {segment.percentage.toFixed(1)}%
                    </text>
                  </motion.g>
                )}
              </motion.g>
            );
          })}

          {/* Center labels */}
          <motion.text
            x="0"
            y="0"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-current font-semibold text-[18px]" // uses current text color [web:1290]
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.35 }}
          >
            {metric === 'avg_waiting_time' ? total.toFixed(1) : total.toFixed(0)}
          </motion.text>

          <motion.text
            x="0"
            y="18"
            textAnchor="middle"
            className="fill-current text-theme-muted text-[10px]" // muted line, still fill-current [web:1290]
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + 0.42 }}
          >
            {metric === 'avg_waiting_time' ? 'seconds' : 'vehicles'}
          </motion.text>
        </motion.svg>

        {/* Legend */}
        <motion.div
          className="space-y-2 flex-1 w-full"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: delay + 0.25 }}
        >
          {chartData.map((item, index) => {
            const colors = getVehicleColor(item.vehicle_type);
            const isHovered = hoveredIndex === index;

            return (
              <motion.button
                type="button"
                key={`legend-${index}`}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                whileHover={{ y: -1 }}
                className="w-full text-left rounded-xl border border-[rgba(var(--color-primary-500-rgb),0.12)]
                           bg-[rgba(var(--color-primary-500-rgb),0.04)] px-3 py-2 transition-colors"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.chartColor }} />
                    <span className="text-sm font-medium text-theme-text capitalize truncate">{item.vehicle_type}</span>
                  </div>

                  <span
                    className="text-sm font-semibold text-theme-text tabular-nums"
                    style={{ opacity: isHovered ? 1 : 0.75 }}
                  >
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-1 text-xs text-theme-muted">
                  {metric === 'avg_waiting_time'
                    ? `${item.avg_waiting_time.toFixed(1)}s avg wait`
                    : `${item.no_of_vehicles} vehicles`}
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>
    </motion.div>
  );
}
  