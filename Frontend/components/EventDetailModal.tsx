'use client';

import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import type { Event } from '@/app/types/events';

interface EventDetailModalProps {
  event: Event;
  isOpen: boolean;
  onClose: () => void;
}

// ========================================
// HELPERS
// ========================================
const norm = (s: string) => (s || '').trim().toLowerCase();

function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Invalid Date';
  }
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function getSeverityConfig(severity: string): { colorVar: string; icon: string; softBgVar: string } {
  const s = norm(severity);
  const config: Record<string, { colorVar: string; icon: string; softBgVar: string }> = {
    critical: { colorVar: '--severity-critical', icon: '🚨', softBgVar: '--severity-critical-soft' },
    high: { colorVar: '--severity-high', icon: '⚠️', softBgVar: '--severity-high-soft' },
    medium: { colorVar: '--severity-medium', icon: '⚡', softBgVar: '--severity-medium-soft' },
    low: { colorVar: '--severity-low', icon: '📌', softBgVar: '--severity-low-soft' },
  };

  return config[s] || { colorVar: '--color-text-muted', icon: '📋', softBgVar: '--color-bg' };
}

// ========================================
// ANIMATION VARIANTS
// ========================================
const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: { opacity: 0, scale: 0.95, y: 10 },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

export default function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  const severity = useMemo(() => getSeverityConfig(event.severity), [event.severity]);

  // ESC to close (basic accessibility)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const severityColor = `var(${severity.colorVar})`;
  const severitySoft = `var(${severity.softBgVar})`;

  const statusStyles =
    norm(event.status) === 'active'
      ? 'bg-[var(--status-active-soft)] text-[var(--status-active)]'
      : norm(event.status) === 'scheduled'
        ? 'bg-[var(--status-scheduled-soft)] text-[var(--status-scheduled)]'
        : 'bg-[var(--status-resolved-soft)] text-[var(--status-resolved)]';

  const statusBorder =
    norm(event.status) === 'active'
      ? 'var(--status-active)'
      : norm(event.status) === 'scheduled'
        ? 'var(--status-scheduled)'
        : 'var(--status-resolved)';

  const incidentType = event.type?.replaceAll('_', ' ').toUpperCase?.() ?? String(event.type || '').toUpperCase();

  const authorities = (event.authorities || event.authorities_notified || []) as string[];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={onClose}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/55 dark:bg-black/70"
          role="presentation"
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-modal-title"
            aria-describedby="event-modal-desc"
            className="bg-theme-surface rounded-2xl border border-[var(--color-border)] max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
          >
            {/* Header (sticky + compact) */}
            <div
              className="sticky top-0 z-10 px-5 py-4 border-b border-[var(--color-border)]"
              style={{
                background: `linear-gradient(90deg, ${severitySoft}, var(--color-surface))`,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className="flex-shrink-0 text-2xl"
                      aria-hidden="true"
                      style={{ lineHeight: 1 }}
                      title={event.severity}
                    >
                      {severity.icon}
                    </span>

                    <div className="min-w-0">
                      <h2 id="event-modal-title" className="text-lg sm:text-xl font-semibold text-theme-text truncate">
                        {event.title}
                      </h2>
                      <p className="text-xs sm:text-sm text-theme-muted truncate">{incidentType}</p>
                    </div>
                  </div>

                  {/* Badges row */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-full ${statusStyles}`}
                      style={{ border: `1px solid ${statusBorder}` }}
                    >
                      {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                    </span>

                    <span
                      className="px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-full"
                      style={{
                        backgroundColor: severitySoft,
                        color: severityColor,
                        border: `1px solid ${severityColor}`,
                      }}
                    >
                      {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)} Severity
                    </span>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  className="flex-shrink-0 h-10 w-10 grid place-items-center rounded-xl border border-[var(--color-border)] text-theme-text hover:bg-theme-bg transition-colors"
                  title="Close"
                >
                  <span className="text-xl leading-none">✕</span>
                </button>
              </div>
            </div>

            {/* Scroll body */}
            <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(90vh-124px)]">
              {/* Description */}
              <section className="rounded-2xl border border-[var(--color-border)] bg-theme-bg p-4">
                <h3 className="text-xs font-semibold text-theme-muted uppercase tracking-wide">Description</h3>
                <p id="event-modal-desc" className="mt-2 text-sm text-theme-text leading-relaxed">
                  {event.description || '—'}
                </p>
              </section>

              {/* Key info grid */}
              <section className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Location */}
                <div
                  className="rounded-2xl border p-4"
                  style={{ borderColor: `color-mix(in srgb, ${severityColor} 25%, var(--color-border))`, background: severitySoft }}
                >
                  <h3 className="text-xs font-semibold text-theme-muted uppercase tracking-wide">Location</h3>
                  <p className="mt-2 text-sm font-semibold text-theme-text">{event.location?.description || '—'}</p>

                  <div className="mt-2 space-y-1">
                    {event.location?.junction_id && (
                      <p className="text-xs text-theme-muted">Junction: {event.location.junction_id}</p>
                    )}
                    {event.location?.route_id && (
                      <p className="text-xs text-theme-muted">Route: {event.location.route_id}</p>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div className="rounded-2xl border border-[var(--color-border)] bg-theme-bg p-4">
                  <h3 className="text-xs font-semibold text-theme-muted uppercase tracking-wide">Time</h3>

                  <div className="mt-3 grid grid-cols-1 gap-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-xs text-theme-muted">Start</span>
                      <span className="text-sm font-semibold text-theme-text text-right">
                        {formatDateTime(event.start_time)}
                      </span>
                    </div>

                    {event.end_time && (
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-xs text-theme-muted">End</span>
                        <span className="text-sm font-semibold text-theme-text text-right">
                          {formatDateTime(event.end_time)}
                        </span>
                      </div>
                    )}
                  </div>

                  {event.estimated_duration_min ? (
                    <div className="mt-4 rounded-xl border border-[var(--color-primary)] bg-[var(--color-primary-soft)] p-3">
                      <p className="text-xs font-semibold text-theme-primary uppercase tracking-wide">Estimated Duration</p>
                      <p className="mt-1 text-lg font-semibold text-theme-text">
                        {formatDuration(event.estimated_duration_min)}
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>

              {/* Traffic impact */}
              {event.impact && (
                <section
                  className="mt-5 rounded-2xl border p-4"
                  style={{
                    borderColor: `color-mix(in srgb, ${severityColor} 25%, var(--color-border))`,
                    background: severitySoft,
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-xs font-semibold text-theme-muted uppercase tracking-wide">Traffic impact</h3>
                    {event.impact.complete_closure && (
                      <span
                        className="px-2.5 py-1 text-xs font-semibold rounded-full"
                        style={{
                          backgroundColor: 'var(--severity-critical-soft)',
                          color: 'var(--severity-critical)',
                          border: '1px solid var(--severity-critical)',
                        }}
                      >
                        Complete closure
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-[var(--color-border)] bg-theme-surface p-3">
                      <p className="text-xs text-theme-muted">Estimated delay</p>
                      <p className="mt-1 text-lg font-semibold text-theme-text">
                        {formatDuration(event.impact.estimated_delay_min || 0)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--color-border)] bg-theme-surface p-3">
                      <p className="text-xs text-theme-muted">Routes affected</p>
                      <p className="mt-1 text-lg font-semibold text-theme-text">
                        {event.impact.affected_routes?.length || 0}
                      </p>
                    </div>

                    <div className="rounded-xl border border-[var(--color-border)] bg-theme-surface p-3">
                      <p className="text-xs text-theme-muted">Lanes blocked</p>
                      <p className="mt-1 text-lg font-semibold text-theme-text">
                        {event.impact.lanes_blocked || 0}
                      </p>
                    </div>
                  </div>

                  {event.impact.affected_routes && event.impact.affected_routes.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-theme-muted">Affected routes</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {event.impact.affected_routes.map((route, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 text-xs rounded-full border border-[var(--color-border)] bg-theme-surface text-theme-text"
                          >
                            {route}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Authorities */}
              {authorities.length > 0 && (
                <section className="mt-5 rounded-2xl border border-[var(--color-border)] bg-theme-bg p-4">
                  <h3 className="text-xs font-semibold text-theme-muted uppercase tracking-wide">Authorities notified</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {authorities.map((authority, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 text-sm rounded-full bg-[var(--color-primary-soft)] text-theme-primary"
                        style={{ border: '1px solid var(--color-primary)' }}
                      >
                        {authority}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Crowd estimate */}
              {event.crowd_estimate && (
                <section
                  className="mt-5 rounded-2xl border p-4"
                  style={{ backgroundColor: 'var(--color-emergency-soft)', borderColor: 'var(--color-emergency)' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-emergency)' }}>
                    Crowd estimate
                  </p>
                  <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--color-emergency)' }}>
                    {event.crowd_estimate.toLocaleString()}
                  </p>
                </section>
              )}

              {/* Incident number */}
              {event.incident_number && (
                <section className="mt-5 rounded-2xl border border-[var(--color-border)] bg-theme-bg p-4">
                  <p className="text-xs font-semibold text-theme-muted uppercase tracking-wide">Incident number</p>
                  <p className="mt-2 text-lg font-mono font-semibold text-theme-text">{event.incident_number}</p>
                </section>
              )}

              {/* Footer meta */}
              <footer className="mt-6 pt-4 border-t border-[var(--color-border)] text-xs text-theme-muted">
                <p>
                  Created by: <span className="font-semibold text-theme-text">{event.created_by || '—'}</span>
                </p>
                <p>Last modified: {event.last_modified ? formatDateTime(event.last_modified) : '—'}</p>
              </footer>
            </div>

            {/* Sticky footer actions */}
            <div className="sticky bottom-0 z-10 border-t border-[var(--color-border)] bg-theme-surface px-5 py-3">
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[var(--color-border)] text-theme-text hover:bg-theme-bg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
