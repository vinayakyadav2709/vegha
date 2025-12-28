/**
 * FilterBar.tsx
 * 
 * Updated: Removed payment status filter
 */

'use client';

import React, { useState } from 'react';
import { Download, Filter, X } from 'lucide-react';
import type { ChallanFilters, DownloadFormat } from '@/app/types/challans';

interface FilterBarProps {
  filters: ChallanFilters;
  onFilterChange: (filters: ChallanFilters) => void;
  onDownload: (format: DownloadFormat) => void;
}

export default function FilterBar({ filters, onFilterChange, onDownload }: FilterBarProps) {
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const hasActiveFilters =
    (filters.violationType && filters.violationType.length > 0) ||
    (filters.status && filters.status.length > 0) ||
    filters.startDate ||
    filters.endDate;

  const clearFilters = () => {
    onFilterChange({});
  };

  return (
    <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--color-border)] bg-theme-surface flex-wrap">
      {/* Filter Icon */}
      <Filter className="h-5 w-5 text-theme-muted" />

      {/* Violation Type Dropdown */}
      <select
        value={filters.violationType?.[0] || ''}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            violationType: e.target.value ? [e.target.value] : undefined,
          })
        }
        className="rounded-lg border border-[var(--color-border)] bg-theme-surface px-3 py-2 text-sm
                   text-theme-text focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
      >
        <option value="">All Violations</option>
        <option value="SIGNAL_JUMP">Signal Jump</option>
        <option value="SPEEDING">Speeding</option>
        <option value="NO_HELMET">No Helmet</option>
        <option value="WRONG_LANE">Wrong Lane</option>
        <option value="PARKING_VIOLATION">Parking Violation</option>
        <option value="TRIPLE_RIDING">Triple Riding</option>
        <option value="MOBILE_USAGE">Mobile Usage</option>
        <option value="NO_SEATBELT">No Seatbelt</option>
        <option value="OVERLOADING">Overloading</option>
        <option value="WRONG_SIDE_DRIVING">Wrong Side Driving</option>
      </select>

      {/* Verification Status Filter */}
      <select
        value={filters.status?.[0] || ''}
        onChange={(e) =>
          onFilterChange({
            ...filters,
            status: e.target.value ? [e.target.value as any] : undefined,
          })
        }
        className="rounded-lg border border-[var(--color-border)] bg-theme-surface px-3 py-2 text-sm
                   text-theme-text focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
      >
        <option value="">All Status</option>
        <option value="PENDING">Pending Verification</option>
        <option value="VERIFIED">Verified</option>
        <option value="REFUTED">Refuted</option>
      </select>

      {/* Date Range */}
      <input
        type="date"
        value={filters.startDate || ''}
        onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
        className="rounded-lg border border-[var(--color-border)] bg-theme-surface px-3 py-2 text-sm
                   text-theme-text focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
        placeholder="Start Date"
      />
      <span className="text-theme-muted text-sm">to</span>
      <input
        type="date"
        value={filters.endDate || ''}
        onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
        className="rounded-lg border border-[var(--color-border)] bg-theme-surface px-3 py-2 text-sm
                   text-theme-text focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
        placeholder="End Date"
      />

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm text-theme-muted
                     hover:text-theme-text hover:bg-[rgba(var(--color-primary-500-rgb),0.06)] transition-colors"
        >
          <X className="h-4 w-4" />
          Clear
        </button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Download Button */}
      <div className="relative">
        <button
          onClick={() => setShowDownloadMenu(!showDownloadMenu)}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm
                     font-medium text-white hover:bg-[var(--color-primary-500)] transition-colors"
        >
          <Download className="h-4 w-4" />
          <span>Download</span>
        </button>

        {showDownloadMenu && (
          <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-[var(--color-border)]
                          bg-theme-surface shadow-lg z-10">
            <button
              onClick={() => {
                onDownload('csv');
                setShowDownloadMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-theme-text hover:bg-[rgba(var(--color-primary-500-rgb),0.06)]
                         rounded-t-lg transition-colors"
            >
              Download as CSV
            </button>
            <button
              onClick={() => {
                onDownload('pdf');
                setShowDownloadMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-theme-text hover:bg-[rgba(var(--color-primary-500-rgb),0.06)]
                         rounded-b-lg transition-colors"
            >
              Download as PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
