'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Map, List } from 'lucide-react';
import ChallanTable from '@/app/dashboard/challans/components/ChallanTable';
import ChallanDetailModal from '@/app/dashboard/challans/components/ChallanDetailModal';
import KPICards from '@/app/dashboard/challans/components/KPICards';
import type { Challan, KPI, HeatmapPoint } from '@/app/types/challans';
import challansData from '@/public/data/challans.json';

// Dynamic import of HeatmapView with no SSR
const HeatmapView = dynamic(() => import('@/app/dashboard/challans/components/HeatmapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-gray-100 rounded-xl flex items-center justify-center border-2 border-[var(--color-border)]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[var(--color-primary)] mx-auto mb-4"></div>
        <p className="text-theme-text font-semibold">Loading map component...</p>
      </div>
    </div>
  ),
});

type ViewMode = 'map' | 'list';

export default function ChallansPage() {
  const [challans, setChallans] = useState<Challan[]>(challansData.challans || []);
  const [kpis, setKpis] = useState<KPI[]>(challansData.kpis || []);
  const [heatmapData, setHeatmapData] = useState<HeatmapPoint[]>(challansData.heatmapData || []);
  const [selectedChallanId, setSelectedChallanId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [scriptsLoaded, setScriptsLoaded] = useState(false);

  // ✅ Wait for Leaflet scripts to load before showing map
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max

    const checkScripts = setInterval(() => {
      attempts++;
      
      if (typeof window !== 'undefined') {
        const L = (window as any).L;
        
        if (L) {
          setScriptsLoaded(true);
          clearInterval(checkScripts);
          console.log('✅ Leaflet scripts ready for map rendering');
        } else if (attempts >= maxAttempts) {
          console.error('❌ Leaflet scripts failed to load within timeout');
          clearInterval(checkScripts);
        }
      }
    }, 100);

    return () => clearInterval(checkScripts);
  }, []);

  const handleViewDetails = (challanId: string) => {
    setSelectedChallanId(challanId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChallanId(null);
  };

  const handleUpdateChallan = (updatedChallan: Challan) => {
    setChallans((prev) =>
      prev.map((c) => (c.challanId === updatedChallan.challanId ? updatedChallan : c))
    );
    
    // Update KPIs based on new status
    setKpis((prevKpis) => {
      const updatedKpis = [...prevKpis];
      const verifiedIndex = updatedKpis.findIndex((k) => k.id === 'verified_challans');
      const pendingIndex = updatedKpis.findIndex((k) => k.id === 'pending_verification');
      const refutedIndex = updatedKpis.findIndex((k) => k.id === 'refuted_challans');

      if (updatedChallan.status === 'VERIFIED' && verifiedIndex !== -1) {
        updatedKpis[verifiedIndex].value += 1;
        if (pendingIndex !== -1) updatedKpis[pendingIndex].value -= 1;
      } else if (updatedChallan.status === 'REFUTED' && refutedIndex !== -1) {
        updatedKpis[refutedIndex].value += 1;
        if (pendingIndex !== -1) updatedKpis[pendingIndex].value -= 1;
      }

      return updatedKpis;
    });

    handleCloseModal();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-text">Traffic Challans</h1>
          <p className="text-theme-muted mt-1">Monitor and verify traffic violations</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 rounded-xl bg-theme-surface border-2 border-[var(--color-border)] text-theme-text font-semibold hover:bg-theme-background transition-colors">
            Export Data
          </button>
          <button className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:opacity-90 transition-opacity">
            Generate Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <KPICards kpis={kpis} />

      {/* View Toggle and Content */}
      <div className="space-y-4">
        {/* Toggle Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-theme-text">
              {viewMode === 'map' ? 'Violation Heatmap' : 'Challan Records'}
            </h2>
            <p className="text-sm text-theme-muted mt-1">
              {viewMode === 'map'
                ? `${heatmapData.length} location${heatmapData.length !== 1 ? 's' : ''} with violations`
                : `${challans.length} total challan${challans.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2 bg-theme-surface rounded-xl p-1 border-2 border-[var(--color-border)] shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-[var(--color-primary)] text-white shadow-md'
                  : 'text-theme-muted hover:bg-theme-background'
              }`}
            >
              <List className="h-4 w-4" />
              List View
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                viewMode === 'map'
                  ? 'bg-[var(--color-primary)] text-white shadow-md'
                  : 'text-theme-muted hover:bg-theme-background'
              }`}
            >
              <Map className="h-4 w-4" />
              Map View
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative">
          {viewMode === 'map' ? (
            scriptsLoaded ? (
              <HeatmapView data={heatmapData} />
            ) : (
              <div className="w-full h-[600px] bg-gray-100 rounded-xl flex items-center justify-center border-2 border-[var(--color-border)]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[var(--color-primary)] mx-auto mb-4"></div>
                  <p className="text-theme-text font-semibold">Loading Leaflet libraries...</p>
                  <p className="text-theme-muted text-xs mt-2">Initializing map dependencies</p>
                </div>
              </div>
            )
          ) : (
            <ChallanTable challans={challans} onViewDetails={handleViewDetails} />
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedChallanId && (
        <ChallanDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          challanId={selectedChallanId}
          allChallans={challans}
          onUpdateChallan={handleUpdateChallan}
        />
      )}
    </div>
  );
}
