/**
 * ViewToggle.tsx
 * 
 * Purpose: Segmented control to switch between List View and Heatmap View.
 * Only one view is active at a time.
 * Styled to match Vegha's existing UI controls with smooth transitions.
 * 
 * Usage: <ViewToggle activeView={view} onViewChange={setView} />
 */

'use client';

import React from 'react';
import { List, Map } from 'lucide-react';

export type ViewMode = 'list' | 'heatmap';

interface ViewToggleProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export default function ViewToggle({ activeView, onViewChange }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-xl border border-[var(--color-border)] bg-theme-surface p-1">
      <button
        onClick={() => onViewChange('list')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
          ${
            activeView === 'list'
              ? 'bg-[var(--color-primary)] text-white shadow-sm'
              : 'text-theme-muted hover:text-theme-text'
          }
        `}
      >
        <List className="h-4 w-4" />
        <span>List View</span>
      </button>

      <button
        onClick={() => onViewChange('heatmap')}
        className={`
          flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
          ${
            activeView === 'heatmap'
              ? 'bg-[var(--color-primary)] text-white shadow-sm'
              : 'text-theme-muted hover:text-theme-text'
          }
        `}
      >
        <Map className="h-4 w-4" />
        <span>Heatmap View</span>
      </button>
    </div>
  );
}
