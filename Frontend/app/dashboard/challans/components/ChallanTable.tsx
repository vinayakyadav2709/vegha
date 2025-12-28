/**
 * ChallanTable.tsx
 * 
 * Updated: Accept onExportFiltered prop for filtered data export
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Eye, Download, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import type { Challan } from '@/app/types/challans';
import { generateChallanPDF } from '@/app/lib/pdfGenerator';

interface ChallanTableProps {
  challans: Challan[];
  onViewDetails: (challanId: string) => void;
  onExportFiltered?: (filteredData: Challan[]) => void; // ✅ NEW PROP
}

// Status badge styling
const statusStyles: Record<string, string> = {
  VERIFIED: 'bg-green-100 text-green-700 border-green-200',
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  REFUTED: 'bg-red-100 text-red-700 border-red-200',
};

export default function ChallanTable({ challans = [], onViewDetails, onExportFiltered }: ChallanTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const pageSize = 10;

  const safeData = Array.isArray(challans) ? challans : [];

  // Helper to extract string from nested objects
  const getLocationString = (location: any): string => {
    if (typeof location === 'string') return location;
    if (location?.junctionName) return location.junctionName;
    return 'N/A';
  };

  const getVehicleNumber = (vehicle: any): string => {
    if (typeof vehicle === 'string') return vehicle;
    if (vehicle?.vehicleNumber) return vehicle.vehicleNumber;
    return 'N/A';
  };

  const getViolationType = (violation: any): string => {
    if (typeof violation === 'string') return violation;
    if (violation?.type) return violation.type.replace(/_/g, ' ');
    return 'N/A';
  };

  const getFineAmount = (fine: any): number => {
    if (typeof fine === 'number') return fine;
    if (fine?.totalAmount) return fine.totalAmount;
    if (fine?.baseAmount) return fine.baseAmount;
    return 0;
  };

  // Filter data
  const filteredData = useMemo(() => {
    return safeData.filter((challan) => {
      const locationStr = getLocationString(challan.location);
      const vehicleStr = getVehicleNumber(challan.vehicle || challan.vehicleNumber);
      const violationStr = getViolationType(challan.violation || challan.violationType);

      const matchesSearch =
        challan.challanId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicleStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        violationStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        locationStr.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || challan.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [safeData, searchTerm, statusFilter]);

  // Pagination
  const totalCount = filteredData.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  const paginatedData = filteredData.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const d = new Date(dateString);
      if (Number.isNaN(d.getTime())) return 'N/A';
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'N/A';
    }
  };

  // Handle download using generateChallanPDF
  const handleDownload = async (challan: Challan, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      setDownloadingId(challan.challanId);
      generateChallanPDF(challan);
      setDownloadingId(null);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      setDownloadingId(null);
      alert('❌ Failed to generate PDF. Please try again.');
    }
  };

  // ✅ Handle Export All (filtered data)
  const handleExportAll = () => {
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

      // Create CSV rows from FILTERED data
      const rows = filteredData.map(challan => [
        challan.challanId,
        getVehicleNumber(challan.vehicle),
        getViolationType(challan.violation),
        getLocationString(challan.location),
        challan.status,
        `${challan.fine.currency} ${challan.fine.totalAmount}`,
        formatDate(challan.issuedAt),
        formatDate(challan.audit.verifiedAt),
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
      
      const filterSuffix = statusFilter !== 'ALL' ? `_${statusFilter}` : '';
      const searchSuffix = searchTerm ? `_filtered` : '';
      
      link.setAttribute('href', url);
      link.setAttribute('download', `challans_export${filterSuffix}${searchSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`✅ Exported ${filteredData.length} challans successfully`);
    } catch (error) {
      console.error('❌ Export failed:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  return (
    <div className="rounded-xl border-2 border-[var(--color-border)] bg-theme-surface overflow-hidden shadow-lg">
      {/* Header with filters */}
      <div className="p-6 border-b-2 border-[var(--color-border)] space-y-4">
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-theme-muted" />
            <input
              type="text"
              placeholder="Search by challan ID, vehicle, violation, location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-[var(--color-border)] bg-theme-background text-theme-text placeholder:text-theme-muted focus:outline-none focus:border-[var(--color-primary)] transition-colors"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-theme-muted pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 rounded-lg border-2 border-[var(--color-border)] bg-theme-background text-theme-text focus:outline-none focus:border-[var(--color-primary)] transition-colors appearance-none cursor-pointer min-w-[160px]"
            >
              <option value="ALL">All Status</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING">Pending</option>
              <option value="REFUTED">Refuted</option>
            </select>
          </div>

          <button 
            onClick={handleExportAll}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white font-semibold hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            Export {searchTerm || statusFilter !== 'ALL' ? 'Filtered' : 'All'} ({filteredData.length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-theme-background sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-theme-muted uppercase tracking-wider">
                Challan ID
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-theme-muted uppercase tracking-wider">
                Vehicle No.
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-theme-muted uppercase tracking-wider">
                Violation
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-theme-muted uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-theme-muted uppercase tracking-wider">
                Fine Amount
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-theme-muted uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-theme-muted uppercase tracking-wider">
                Issued At
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-theme-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-theme-muted">
                  <p className="text-lg font-semibold mb-2">No challans found</p>
                  <p className="text-sm">Try adjusting your search or filter criteria</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((challan) => (
                <tr
                  key={challan.challanId}
                  onClick={() => onViewDetails(challan.challanId)}
                  className="hover:bg-theme-background cursor-pointer transition-colors"
                >
                  <td className="px-4 py-4 text-sm font-medium text-theme-text">
                    {challan.challanId}
                  </td>
                  <td className="px-4 py-4 text-sm text-theme-text font-mono">
                    {getVehicleNumber(challan.vehicle || challan.vehicleNumber)}
                  </td>
                  <td className="px-4 py-4 text-sm text-theme-text">
                    {getViolationType(challan.violation || challan.violationType)}
                  </td>
                  <td className="px-4 py-4 text-sm text-theme-text">
                    {getLocationString(challan.location)}
                  </td>
                  <td className="px-4 py-4 text-sm text-right font-semibold text-theme-text">
                    ₹{getFineAmount(challan.fine || challan.fineAmount).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                        statusStyles[challan.status] || statusStyles.PENDING
                      }`}
                    >
                      {challan.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-theme-text">
                    {formatDate(challan.timestamp || challan.issuedAt)}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewDetails(challan.challanId);
                        }}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-primary)]/10 transition-colors"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4 text-theme-muted" />
                      </button>
                      <button
                        onClick={(e) => handleDownload(challan, e)}
                        disabled={downloadingId === challan.challanId}
                        className="p-1.5 rounded-lg hover:bg-[var(--color-primary)]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Download PDF"
                      >
                        {downloadingId === challan.challanId ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-transparent border-t-[var(--color-primary)]" />
                        ) : (
                          <Download className="h-4 w-4 text-theme-muted" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t-2 border-[var(--color-border)] flex-wrap gap-4">
          <div className="text-sm text-theme-muted">
            Showing {totalCount === 0 ? 0 : startIndex + 1} to {endIndex} of {totalCount} results
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border-2 border-[var(--color-border)] text-sm text-theme-text hover:bg-theme-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    page === currentPage
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-theme-text hover:bg-theme-background border-2 border-[var(--color-border)]'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border-2 border-[var(--color-border)] text-sm text-theme-text hover:bg-theme-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
