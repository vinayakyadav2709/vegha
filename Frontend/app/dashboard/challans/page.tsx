'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Map, List, Download, FileText } from 'lucide-react';
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

  // Wait for Leaflet scripts to load before showing map
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 50;

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

  // ✅ Export Data as CSV
  const handleExportData = () => {
    try {
      // Create CSV headers
      const headers = [
        'Challan ID',
        'Vehicle Number',
        'Violation Type',
        'Location',
        'Status',
        'Fine Amount',
        'Issued At',
        'Verified At',
        'Verified By'
      ];

      // Helper to safely format dates
      const formatDateForExport = (dateString?: string | null): string => {
        if (!dateString) return 'N/A';
        try {
          const d = new Date(dateString);
          if (Number.isNaN(d.getTime())) return 'N/A';
          return d.toLocaleString();
        } catch {
          return 'N/A';
        }
      };

      // Create CSV rows
      const rows = challans.map(challan => [
        challan.challanId,
        challan.vehicle.vehicleNumber,
        challan.violation.type,
        challan.location.junctionName,
        challan.status,
        `${challan.fine.currency} ${challan.fine.totalAmount}`,
        formatDateForExport(challan.issuedAt),
        formatDateForExport(challan.audit.verifiedAt),
        challan.audit.verifiedBy || 'N/A'
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `challans_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ Data exported successfully');
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  // ✅ Generate PDF Report
  const handleGenerateReport = () => {
    try {
      // Calculate statistics
      const totalChallans = challans.length;
      const verifiedCount = challans.filter(c => c.status === 'VERIFIED').length;
      const pendingCount = challans.filter(c => c.status === 'PENDING').length;
      const refutedCount = challans.filter(c => c.status === 'REFUTED').length;
      const totalFines = challans.reduce((sum, c) => sum + c.fine.totalAmount, 0);

      // Violation type breakdown
      const violationCounts: Record<string, number> = {};
      challans.forEach(c => {
        violationCounts[c.violation.type] = (violationCounts[c.violation.type] || 0) + 1;
      });

      // Create HTML report
      const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Vegha Traffic Challan Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #dc2626;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #dc2626;
      margin: 0;
    }
    .header p {
      color: #666;
      margin: 5px 0;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    .summary-card {
      background: #f9fafb;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
      text-align: center;
    }
    .summary-card h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #666;
      text-transform: uppercase;
    }
    .summary-card p {
      margin: 0;
      font-size: 32px;
      font-weight: bold;
      color: #1f2937;
    }
    .section {
      margin-bottom: 40px;
    }
    .section h2 {
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
      color: #1f2937;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 12px;
      text-align: left;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #1f2937;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    @media print {
      body { margin: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚦 Vegha Traffic Management System</h1>
    <p><strong>Challan Report</strong></p>
    <p>Generated on: ${new Date().toLocaleString()}</p>
  </div>

  <div class="summary">
    <div class="summary-card">
      <h3>Total Challans</h3>
      <p>${totalChallans}</p>
    </div>
    <div class="summary-card">
      <h3>Verified</h3>
      <p style="color: #10b981;">${verifiedCount}</p>
    </div>
    <div class="summary-card">
      <h3>Pending</h3>
      <p style="color: #f59e0b;">${pendingCount}</p>
    </div>
    <div class="summary-card">
      <h3>Total Fines</h3>
      <p style="color: #dc2626;">₹${totalFines.toLocaleString()}</p>
    </div>
  </div>

  <div class="section">
    <h2>Violation Type Breakdown</h2>
    <table>
      <thead>
        <tr>
          <th>Violation Type</th>
          <th>Count</th>
          <th>Percentage</th>
        </tr>
      </thead>
      <tbody>
        ${Object.entries(violationCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => `
            <tr>
              <td>${type.replace(/_/g, ' ')}</td>
              <td>${count}</td>
              <td>${((count / totalChallans) * 100).toFixed(1)}%</td>
            </tr>
          `).join('')}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Recent Challans</h2>
    <table>
      <thead>
        <tr>
          <th>Challan ID</th>
          <th>Vehicle</th>
          <th>Violation</th>
          <th>Location</th>
          <th>Status</th>
          <th>Fine</th>
        </tr>
      </thead>
      <tbody>
        ${challans.slice(0, 20).map(c => `
          <tr>
            <td>${c.challanId}</td>
            <td>${c.vehicle.vehicleNumber}</td>
            <td>${c.violation.type.replace(/_/g, ' ')}</td>
            <td>${c.location.junctionName}</td>
            <td><span style="color: ${
              c.status === 'VERIFIED' ? '#10b981' : 
              c.status === 'PENDING' ? '#f59e0b' : '#ef4444'
            };">${c.status}</span></td>
            <td>₹${c.fine.totalAmount}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Vegha Traffic Management System. All rights reserved.</p>
    <p>This is an automated report generated by the system.</p>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>
      `;

      // Open in new window and trigger print
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(reportHTML);
        printWindow.document.close();
      } else {
        alert('Please allow popups to generate the report.');
      }

      console.log('✅ Report generated successfully');
    } catch (error) {
      console.error('❌ Report generation failed:', error);
      alert('Failed to generate report. Please try again.');
    }
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
          <button 
            onClick={handleExportData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-theme-surface border-2 border-[var(--color-border)] text-theme-text font-semibold hover:bg-theme-background transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Data
          </button>
          <button 
            onClick={handleGenerateReport}  
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:opacity-90 transition-opacity"
          >
            <FileText className="h-4 w-4" />
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
            <ChallanTable 
              challans={challans} 
              onViewDetails={handleViewDetails}
              onExportFiltered={handleExportData}
            />
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
