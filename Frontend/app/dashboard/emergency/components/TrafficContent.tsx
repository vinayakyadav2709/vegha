'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AnimatedDonutChart from './AnimatedDonutChart';
import VehicleTypeCard from './VehicleTypeCard';
import SummaryStats from './SummaryStats';
import TrafficSkeleton from './TrafficSkeleton';
import { getTrafficData, getVehicleIcon, getVehicleColor, getWaitTimeStatus } from './utils.client';
import { TrafficData } from './types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
};

export default function TrafficContent() {
  const [data, setData] = useState<TrafficData | null>(null);

  useEffect(() => {
    getTrafficData().then(setData);
  }, []);

  if (!data) return <TrafficSkeleton />;

  return (
    <motion.div className="space-y-6" initial="hidden" animate="visible" variants={containerVariants}>
      <SummaryStats data={data} />

      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-6" variants={containerVariants}>
        {data.traffic_data.map((vehicleData, index) => (
          <VehicleTypeCard key={vehicleData.vehicle_type} data={vehicleData} index={index} />
        ))}
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-theme-text "
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
      >
        <AnimatedDonutChart data={data.traffic_data} title="Traffic Consumption" metric="no_of_vehicles" delay={1.4} />
        <AnimatedDonutChart data={data.traffic_data} title="Waiting Time Distribution" metric="avg_waiting_time" delay={1.6} />
      </motion.div>

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.6 }}
      >
        {/* Traffic Status */}
        <motion.div
          className="bg-theme-surface rounded-2xl border border-[var(--color-border)] p-6 shadow-sm"
          whileHover={{ scale: 1.01 }}
        >
          <h3 className="text-lg font-semibold text-theme-text mb-4">Traffic Status</h3>

          <div className="space-y-3">
            {data.traffic_data.map((item, index) => {
              const s = getWaitTimeStatus(item.avg_waiting_time);
              const StatusIcon = s.icon;
              const colors = getVehicleColor(item.vehicle_type);

              return (
                <motion.div
                  key={`status-${item.vehicle_type}`}
                  className="flex items-center justify-between p-3 rounded-xl
                             border border-[rgba(var(--color-primary-500-rgb),0.12)]
                             bg-[rgba(var(--color-primary-500-rgb),0.04)]"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.1 + index * 0.1 }}
                  whileHover={{ x: 4 }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <motion.div
                      className={colors.icon}
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {getVehicleIcon(item.vehicle_type)}
                    </motion.div>

                    <span className="font-medium text-theme-text capitalize truncate">{item.vehicle_type}</span>
                  </div>

                  <motion.div
                    className="flex items-center gap-2"
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <StatusIcon className={`w-5 h-5 ${s.color}`} />
                    <span className={`text-sm font-medium ${s.color}`}>{s.label}</span>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          className="bg-theme-surface rounded-2xl border border-[var(--color-border)] p-6 shadow-sm"
          whileHover={{ scale: 1.01 }}
        >
          <h3 className="text-lg font-semibold text-theme-text mb-4">Key Metrics</h3>

          <div className="space-y-4">
            <motion.div
              className="flex items-center justify-between p-3 rounded-xl
                         border border-[rgba(var(--color-primary-500-rgb),0.14)]
                         bg-[rgba(var(--color-primary-500-rgb),0.06)]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.2 }}
              whileHover={{ scale: 1.02 }}
            >
              <span className="text-sm font-medium text-theme-muted">Most Active</span>
              <motion.span
                className="font-bold text-[var(--color-primary)] capitalize"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {data.traffic_data.reduce((prev, current) =>
                  prev.no_of_vehicles > current.no_of_vehicles ? prev : current
                ).vehicle_type}
              </motion.span>
            </motion.div>

            <motion.div
              className="flex items-center justify-between p-3 rounded-xl
                         border border-[rgba(34,197,94,0.18)]
                         bg-[rgba(34,197,94,0.08)]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.3 }}
              whileHover={{ scale: 1.02 }}
            >
              <span className="text-sm font-medium text-theme-muted">Fastest Flow</span>
              <motion.span
                className="font-bold text-[var(--color-success)] capitalize"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {data.traffic_data.reduce((prev, current) =>
                  prev.avg_waiting_time < current.avg_waiting_time ? prev : current
                ).vehicle_type}
              </motion.span>
            </motion.div>

            <motion.div
              className="flex items-center justify-between p-3 rounded-xl
                         border border-[rgba(168,85,247,0.18)]
                         bg-[rgba(168,85,247,0.08)]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.4 }}
              whileHover={{ scale: 1.02 }}
            >
              <span className="text-sm font-medium text-theme-muted">Traffic Efficiency</span>
              <motion.span
                className="font-bold text-[var(--color-emergency)]"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                {(
                  (1 - (data.traffic_data.reduce((sum, item) => sum + item.avg_waiting_time, 0) / data.traffic_data.length) / 60) *
                  100
                ).toFixed(0)}
                %
              </motion.span>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
