'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { Event } from '@/app/types/events';
import EventDetailModal from './EventDetailModal';
import { MapPin, Calendar, Timer, ClockAlert, Shield } from 'lucide-react';

interface EventCardProps {
  event: Event;
  className?: string;
  index?: number;
}

// =====================
// HELPERS
// =====================
const norm = (s: string) => (s || '').trim().toLowerCase();

function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
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

function getSeverityConfig(severity: string): { text: string; pillBg: string } {
  const s = norm(severity);
  const config: Record<string, { text: string; pillBg: string }> = {
    critical: { text: 'text-[var(--severity-critical)]', pillBg: 'bg-[var(--severity-critical-soft)]' },
    high: { text: 'text-[var(--severity-high)]', pillBg: 'bg-[var(--severity-high-soft)]' },
    medium: { text: 'text-[var(--severity-medium)]', pillBg: 'bg-[var(--severity-medium-soft)]' },
    low: { text: 'text-[var(--severity-low)]', pillBg: 'bg-[var(--severity-low-soft)]' },
  };

  return (
    config[s] || {
      text: 'text-[var(--color-text-muted)]',
      pillBg: 'bg-theme-bg',
    }
  );
}

function getStatusBadge(status: string): string {
  const s = norm(status);
  if (s === 'active') return 'bg-[var(--status-active-soft)] text-[var(--status-active)]';
  if (s === 'scheduled') return 'bg-[var(--status-scheduled-soft)] text-[var(--status-scheduled)]';
  return 'bg-[var(--status-resolved-soft)] text-[var(--status-resolved)]';
}

// --- Color mapping as RGB so everything is reliable and consistent ---
function getSeverityRgb(severity: string): string {
  switch (norm(severity)) {
    case 'critical':
      return '239, 68, 68';
    case 'high':
      return '249, 115, 22';
    case 'medium':
      return '20, 184, 166';
    case 'low':
      return '59, 130, 246';
    default:
      return '148, 163, 184';
  }
}

function getStatusRingRgb(status: string): string {
  switch (norm(status)) {
    case 'active':
      return '34, 197, 94';
    case 'scheduled':
      return '59, 130, 246';
    case 'cancelled':
      return '239, 68, 68';
    default:
      return '148, 163, 184';
  }
}

function getSeverityRingStyle(severity: string): React.CSSProperties {
  const rgb = getSeverityRgb(severity);
  const thicknessPx = 2;
  const a = 0.30;
  return { boxShadow: `0 0 0 ${thicknessPx}px rgba(${rgb}, ${a})` };
}

// function getSeverityLeftFadeStyle(severity: string): React.CSSProperties {
//   const rgb = getSeverityRgb(severity);
//   const startA = 0.4;
//   const midA = 0.18;

//   return {
//     background: `linear-gradient(90deg,
//       rgba(${rgb}, ${startA}) 0%,
//       rgba(${rgb}, ${midA}) 10%,
//       rgba(${rgb}, 0) 20%
//     )`,
//   };
// }

// (unused but kept to not change your logic surface)
function getStatusRingStyle(status: string): React.CSSProperties {
  const rgb = getStatusRingRgb(status);
  const thicknessPx = 2;
  const a = 0.28;
  return { boxShadow: `0 0 0 ${thicknessPx}px rgba(${rgb}, ${a})` };
}

// =====================
// MOTION
// =====================
import { Variants } from 'framer-motion';

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.4,
      easing: 'easeOut',
    },
  }),
};

// =====================
// COMPONENT
// =====================
export default function EventCard({ event, className = '', index = 0 }: EventCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sev = getSeverityConfig(event.severity);
  const statusBadge = getStatusBadge(event.status);

  // const leftFadeStyle = getSeverityLeftFadeStyle(event.severity);
  const ringStyle = getSeverityRingStyle(event.severity);

  const start = event.start_time ? new Date(event.start_time) : null;
  const end = event.end_time ? new Date(event.end_time) : null;
  const hasValidDuration = !!(start && end && !isNaN(start.getTime()) && !isNaN(end.getTime()));
  const durationMin = hasValidDuration
    ? Math.max(0, Math.round((end!.getTime() - start!.getTime()) / 60000))
    : (event as any).estimated_duration_min ?? null;

  const delayMin = event.impact?.estimated_delay_min ?? null;
  const authorities: string[] = (event as any).authorities ?? (event as any).authorities_notified ?? [];

  // Primary highlight style (Date + Location) based on severity hue
  const severityRgb = useMemo(() => getSeverityRgb(event.severity), [event.severity]);

  const primaryBlockStyle: React.CSSProperties = {
    border: `1px solid rgba(${severityRgb}, 0.18)`,
    background: `linear-gradient(180deg, rgba(${severityRgb}, 0.12) 0%, rgba(${severityRgb}, 0.06) 100%)`,
  };

  return (
    <>
      <motion.div
        custom={index}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover={{ y: -3 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        onClick={() => setIsModalOpen(true)}
        style={{
          backgroundColor: 'var(--color-surface)',
          ...ringStyle,
        }}
        className={`
          group relative cursor-pointer overflow-hidden
          rounded-2xl
          hover:shadow-sm transition
          ${className}
        `}
      >
        {/* left fade accent */}
        {/* <div className="absolute inset-y-0 left-0 w-2/5" style={leftFadeStyle} aria-hidden="true" /> */}

        <div className="relative px-5 py-5 pl-6 h-full flex flex-col">
          {/* Title + badges (unchanged layout) */}
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-theme-text leading-snug line-clamp-2">
              {event.title}
            </h3>

            <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
              <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${statusBadge}`}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>

              <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${sev.pillBg} ${sev.text}`}>
                {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)}
              </span>
            </div>
          </div>

          {/* BODY: neat column pattern */}
          <div className="mt-4 space-y-4">
            {/* PRIMARY: Date + Location */}
            <div className="rounded-xl p-3" style={primaryBlockStyle}>
              {/* left accent bar (not only color: also grouping + weight) */}
              <div
                aria-hidden="true"
                className="absolute"
                style={{
                  display: 'none',
                }}
              />

              <div className="space-y-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Calendar className="h-5 w-5 flex-shrink-0" style={{ color: `rgb(${severityRgb})` }} />
                  <span className="text-theme-text font-semibold flex-shrink-0">Date:</span>
                  
                  {/* date + time, single-line ellipsis */}
                  <span className="text-theme-text/90 min-w-0 truncate">
                    {formatDateTime(event.start_time)}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: `rgb(${severityRgb})` }} />
                  <span className="text-theme-text font-semibold flex-shrink-0">Location:</span>
                  <span className="text-theme-text/90 min-w-0 line-clamp-2">
                    {event.location.description}
                  </span>
                </div>
              </div>
            </div>

            {/* SECONDARY: remaining meta (same column pattern, visually calmer) */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-base text-theme-muted">
                <ClockAlert className="h-5 w-5 text-theme-muted" />
                <span className="font-medium text-theme-text">Delay:</span>
                <span className="tabular-nums">{delayMin !== null ? formatDuration(delayMin) : '—'}</span>
              </div>

              <div className="flex items-center gap-2 text-base text-theme-muted">
                <Timer className="h-5 w-5 text-theme-muted" />
                <span className="font-medium text-theme-text">Event duration:</span>
                <span className="tabular-nums">{durationMin !== null ? formatDuration(durationMin) : '—'}</span>
              </div>

              <div className="flex items-center gap-2 text-base text-theme-muted">
                <Shield className="h-5 w-5 text-theme-muted" />
                <span className="font-medium text-theme-text">Authorities:</span>
                <span className="min-w-0 truncate">{authorities.length > 0 ? authorities.join(', ') : '—'}</span>
              </div>
            </div>
          </div>

          {/* Mobile chips (unchanged) */}
          <div className="sm:hidden mt-4 flex items-center gap-2 flex-wrap">
            <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${statusBadge}`}>
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </span>
            <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${sev.pillBg} ${sev.text}`}>
              {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)}
            </span>
            <span className="rounded-full px-3 py-1.5 text-sm font-semibold bg-[var(--color-emergency-soft)] text-[var(--color-emergency)]">
              {event.type.replace('_', ' ').substring(0, 16)}
            </span>
          </div>

          <div className="mt-auto pt-4">
            <div className="h-px w-full bg-black/10" />
            <div className="mt-3 flex items-center justify-end gap-2 text-theme-muted/60 group-hover:text-theme-muted transition-colors text-base">
              <span className="leading-none">See details</span>
              {/* make arrow a fixed flex box so it centers */}
              <span className="inline-flex h-5 w-5 items-center justify-center leading-none">
                →
              </span>
            </div>
          </div>

        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileHover={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="pointer-events-none absolute inset-0 opacity-0
                     bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.05),transparent)]"
        />
      </motion.div>

      <EventDetailModal event={event} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
