
// wrapper for KPI cards in the challans dashboard.
'use client';

import React from 'react';
import KPICard from './KPICard';
import type { KPI } from '@/app/types/challans';

interface KPICardsProps {
  kpis: KPI[];
}

export default function KPICards({ kpis }: KPICardsProps) {
  if (!Array.isArray(kpis) || kpis.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {kpis.map((kpi, index) => (
        <KPICard key={kpi.id} data={kpi} delay={index * 100} />
      ))}
    </div>
  );
}
