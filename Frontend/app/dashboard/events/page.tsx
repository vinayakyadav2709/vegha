'use client';

import { useState, useEffect, useMemo } from 'react';
import { getEvents } from '@/lib/api';
import type {
  Event,
  EventsResponse,
  EventSeverity,
  EventStatus,
  NewEventState,
} from '@/app/types/events';
import { initialNewEventState } from '@/app/types/events';
import EventCard from '@/components/EventCard';
import AddEventModal from '@/components/AddEventModal';
import { Plus, Search } from 'lucide-react';

// Helper function to format dates
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

type SortKey = 'latest' | 'soonest' | 'severity' | 'title';

const severityRank: Record<EventSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// If you already have this elsewhere, keep using that one and delete this.
// This is just here so this file is self-contained & type-safe.
function toEventPayload(state: NewEventState) {
  const estimatedDelay =
    state.estimated_delay_min.trim() === '' ? null : Number(state.estimated_delay_min);

  return {
    id: state.id || undefined,
    title: state.title,
    description: state.description,
    type: state.type || undefined,
    severity: state.severity || undefined,
    status: state.status,

    location: {
      mode: state.locationMode,
      junction_id: state.junction_id || undefined,
      route_id: state.route_id || undefined,
      description: state.location_description || undefined,
    },

    start_time: state.start_time || undefined,
    end_time: state.end_time || undefined,

    affected_routes: state.affected_routes,
    estimated_delay_min: Number.isFinite(estimatedDelay as number) ? estimatedDelay : null,

    authorities: state.authoritiesMode === 'authorities' ? state.authorities : [],
    created_by: state.created_by,
  };
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const [timestamp, setTimestamp] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // search/sort/filter state
  const [query, setQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | EventSeverity>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EventStatus>('all');
  const [sortBy, setSortBy] = useState<SortKey>('latest');

  const isFiltered =
    query.trim() !== '' || severityFilter !== 'all' || statusFilter !== 'all' || sortBy !== 'latest';

  function clearAll() {
    setQuery('');
    setSeverityFilter('all');
    setStatusFilter('all');
    setSortBy('latest');
  }

  // Form state (single shared type from @/app/types/events)
  const [newEvent, setNewEvent] = useState<NewEventState>(initialNewEventState);

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      setLoading(true);
      const eventsData: EventsResponse = await getEvents();
      setEvents(eventsData.events);
      setTotalCount(eventsData.total_count);
      setActiveCount(eventsData.active_count);
      setTimestamp(eventsData.timestamp);
      setError(null);
    } catch (err) {
      setError('Failed to load events data');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitEvent() {
    try {
      const payload = toEventPayload(newEvent);

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setShowAddModal(false);
        setNewEvent(initialNewEventState);
        loadEvents();
      } else {
        console.error('Add event failed:', await response.text());
      }
    } catch (err) {
      console.error('Error adding event:', err);
    }
  }

  const visibleEvents = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = events.filter((e) => {
      if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
      if (statusFilter !== 'all' && e.status !== statusFilter) return false;

      if (!q) return true;

      const hay = [e.title, e.description, e.type, e.location?.description, e.id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return hay.includes(q);
    });

    list = [...list].sort((a, b) => {
      const aStart = new Date(a.start_time).getTime();
      const bStart = new Date(b.start_time).getTime();

      switch (sortBy) {
        case 'latest':
          return bStart - aStart;
        case 'soonest':
          return aStart - bStart;
        case 'severity': {
          const ar = severityRank[a.severity] ?? 0;
          const br = severityRank[b.severity] ?? 0;
          if (br !== ar) return br - ar;
          return bStart - aStart;
        }
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return list;
  }, [events, query, severityFilter, statusFilter, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center px-4">
        <div className="card card-hover w-full max-w-sm text-center">
          <div
            className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-[var(--color-border)]
                       border-t-[var(--color-primary)] animate-spin"
          />
          <p className="text-theme-muted text-sm">Loading events…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center px-4">
        <div className="card w-full max-w-screen">
          <div className="flex items-start gap-4">
            <div className="text-3xl leading-none">⚠️</div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-theme-text">Failed to load events</h1>
              <p className="mt-1 text-sm text-theme-muted">{error}</p>

              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => loadEvents()}
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white
                             bg-[var(--color-primary)] hover:bg-[var(--color-primary-500)] transition-colors"
                >
                  Retry
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold
                             border border-[var(--color-border)] bg-theme-surface text-theme-text
                             hover:bg-[rgba(var(--color-primary-500-rgb),0.06)] transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme-bg">
      {/* Header */}
      <div
        className="
          sticky top-0 z-20
          bg-[var(--color-bg)]/72 backdrop-blur-xl
        "
        style={{
          boxShadow:
            'inset 0 -1px 0 rgba(0,0,0,0.08), inset 0 -4px 0 rgba(var(--color-primary-500-rgb),0.08)',
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(var(--color-primary-500-rgb),0.22), transparent)',
          }}
        />

        <div className="mx-auto w-full max-w-screen  py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-[var(--color-text)] tracking-tight leading-tight">
                Traffic Events
              </h1>
              <p className="mt-0.5 text-xs sm:text-sm text-[var(--color-text-muted)] truncate">
                Real-time traffic events and incidents management
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-theme-surface px-3 py-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">Total</span>
                  <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-sm font-semibold text-[var(--color-primary)] tabular-nums">
                    {totalCount}
                  </span>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-theme-surface px-3 py-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-muted)]">Active</span>
                  <span className="rounded-full bg-[var(--color-success-soft)] px-2.5 py-0.5 text-sm font-semibold text-[var(--color-success)] tabular-nums">
                    {activeCount}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="
                  inline-flex items-center gap-2 rounded-full
                  px-3.5 py-2 text-sm font-semibold text-white
                  bg-[var(--color-primary)] hover:bg-[var(--color-primary-500)]
                  shadow-sm hover:shadow-md transition
                  focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]
                  focus:ring-offset-2 focus:ring-offset-[var(--color-bg)]
                "
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Event</span>
                <span className="sm:hidden">Add</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-screen py-6 p ">
        {events.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-4xl mb-3">📅</div>
            <h3 className="text-base font-semibold text-theme-text">No events found</h3>
            <p className="mt-1 text-sm text-theme-muted">There are currently no traffic events to display.</p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-theme-muted">Last updated: {formatDateTime(timestamp)}</p>

              <div className="rounded-2xl border border-[var(--color-border)] bg-theme-surface shadow-sm">
                <div className="flex flex-wrap items-center gap-2 p-2">
                  {/* Search */}
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search events"
                      className="w-full rounded-xl border border-[var(--color-border)] bg-theme-surface pl-9 pr-3 py-2 text-sm text-theme-text
                          placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.25)]"
                    />
                  </div>

                  {/* Severity */}
                  <div className="relative">
                    <select
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value as any)}
                      className="appearance-none rounded-xl border border-[var(--color-border)] bg-theme-surface
                          pl-3 pr-10 py-2 text-sm text-theme-text
                          focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.25)]"
                    >
                      <option value="all">Severity: All</option>
                      <option value="critical">Severity: Critical</option>
                      <option value="high">Severity: High</option>
                      <option value="medium">Severity: Medium</option>
                      <option value="low">Severity: Low</option>
                    </select>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>

                  {/* Status */}
                  <div className="relative">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="appearance-none rounded-xl border border-[var(--color-border)] bg-theme-surface
                          pl-3 pr-10 py-2 text-sm text-theme-text
                          focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.25)]"
                    >
                      <option value="all">Status: All</option>
                      <option value="active">Status: Active</option>
                      <option value="scheduled">Status: Scheduled</option>
                      <option value="completed">Status: Completed</option>
                      <option value="cancelled">Status: Cancelled</option>
                      <option value="inactive">Status: Inactive</option>
                    </select>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>

                  {/* Sort */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as SortKey)}
                      className="appearance-none rounded-xl border border-[var(--color-border)] bg-theme-surface
                          pl-3 pr-10 py-2 text-sm text-theme-text
                          focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.25)]"
                    >
                      <option value="latest">Sort: Latest</option>
                      <option value="soonest">Sort: Soonest</option>
                      <option value="severity">Sort: Severity</option>
                      <option value="title">Sort: Title</option>
                    </select>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-theme-muted"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.94l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0L5.21 8.29a.75.75 0 0 1 .02-1.08z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>

                  {/* Clear */}
                  <button
                    type="button"
                    onClick={clearAll}
                    disabled={!isFiltered}
                    className="rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-sm font-semibold text-theme-text
                        hover:bg-[rgba(var(--color-primary-500-rgb),0.06)] transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>

            {visibleEvents.length === 0 && (
              <div className="card text-center py-10 mt-6">
                <h3 className="text-base font-semibold text-theme-text">No matching events</h3>
                <p className="mt-1 text-sm text-theme-muted">Try changing search, filters, or sort.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Extracted modal */}
      <AddEventModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleSubmitEvent}
        newEvent={newEvent}
        setNewEvent={setNewEvent}
      />
    </div>
  );
}
