'use client';

import React from 'react';
import type { NewEventState, LocationMode, AuthoritiesMode } from '@/app/types/events';

type AddEventModalProps = {
  isOpen: boolean;
  onClose: () => void;

  /**
   * Keep same parent behavior: parent still does POST onSubmit using `newEvent`.
   * This modal just collects the fields.
   */
  onSubmit: () => void;

  newEvent: NewEventState;
  setNewEvent: React.Dispatch<React.SetStateAction<NewEventState>>;
};

function parseCsv(v: string): string[] {
  return v
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AddEventModal({
  isOpen,
  onClose,
  onSubmit,
  newEvent,
  setNewEvent,
}: AddEventModalProps) {
  if (!isOpen) return null;

  const affectedRoutesText = (newEvent.affected_routes || []).join(', ');
  const authoritiesText = (newEvent.authorities || []).join(', ');

  const canSubmit =
    !!newEvent.id.trim() &&
    !!newEvent.title.trim() &&
    !!newEvent.description.trim() &&
    !!newEvent.type.trim() &&
    !!String(newEvent.severity).trim() &&
    !!newEvent.status.trim() &&
    !!newEvent.start_time &&
    !!newEvent.end_time &&
    !!newEvent.location_description.trim() &&
    (newEvent.locationMode === 'junction'
      ? !!newEvent.junction_id.trim()
      : newEvent.locationMode === 'route'
        ? !!newEvent.route_id.trim()
        : true) &&
    // estimated_delay_min is a string in shared NewEventState; empty allowed
    (newEvent.estimated_delay_min !== '' ? Number(newEvent.estimated_delay_min) >= 0 : true) &&
    (newEvent.affected_routes?.length ?? 0) > 0 &&
    (newEvent.authorities?.length ?? 0) > 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-theme-surface rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-[var(--color-border)]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--color-border)]">
          <h2 className="text-xl sm:text-2xl font-semibold text-theme-text">Add New Event</h2>
          <button
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl
                       border border-[var(--color-border)] bg-theme-surface text-theme-muted
                       hover:bg-[rgba(var(--color-primary-500-rgb),0.06)] transition-colors text-xl font-bold"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Basics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-text mb-2">Event ID *</label>
              <input
                value={newEvent.id}
                onChange={(e) => setNewEvent((p) => ({ ...p, id: e.target.value }))}
                className="w-full rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-theme-text
                           focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
                placeholder="e.g. E007"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-2">Status *</label>
              <select
                value={newEvent.status}
                onChange={(e) => setNewEvent((p) => ({ ...p, status: e.target.value as NewEventState['status'] }))}
                className="w-full rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-theme-text
                           focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
              >
                <option value="">Select status</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-2">Title *</label>
            <input
              value={newEvent.title}
              onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
              className="w-full rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-theme-text
                         focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
              placeholder="Enter event title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-theme-text mb-2">Description *</label>
            <textarea
              value={newEvent.description}
              onChange={(e) => setNewEvent((p) => ({ ...p, description: e.target.value }))}
              className="w-full min-h-[96px] rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-theme-text
                         focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
              placeholder="Short description"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-text mb-2">Type *</label>
              <select
                value={newEvent.type}
                onChange={(e) => setNewEvent((p) => ({ ...p, type: e.target.value }))}
                className="w-full rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-theme-text
                           focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
              >
                <option value="">Select type</option>
                <option value="construction">Construction</option>
                <option value="religious_event">Religious event</option>
                <option value="accident">Accident</option>
                <option value="maintenance">Maintenance</option>
                <option value="protest">Protest</option>
                <option value="weather">Weather</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-2">Severity *</label>
              <select
                value={newEvent.severity}
                onChange={(e) =>
                  setNewEvent((p) => ({ ...p, severity: e.target.value as NewEventState['severity'] }))
                }
                className="w-full rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-theme-text
                           focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
              >
                <option value="">Select severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-2">Delay (min)</label>
              <input
                type="number"
                min={0}
                value={newEvent.estimated_delay_min}
                onChange={(e) =>
                  setNewEvent((p) => ({
                    ...p,
                    estimated_delay_min: e.target.value, // keep as string (shared state)
                  }))
                }
                className="w-full rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-theme-text
                           focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
                placeholder="e.g. 25"
              />
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-text mb-2">Start time *</label>
              <input
                type="datetime-local"
                value={newEvent.start_time}
                onChange={(e) => setNewEvent((p) => ({ ...p, start_time: e.target.value }))}
                className="w-full rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-theme-text
                           focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-text mb-2">End time *</label>
              <input
                type="datetime-local"
                value={newEvent.end_time}
                onChange={(e) => setNewEvent((p) => ({ ...p, end_time: e.target.value }))}
                className="w-full rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-theme-text
                           focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
              />
            </div>
          </div>

          {/* Location */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(var(--color-primary-500-rgb),0.04)] p-4 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-theme-text">Location</div>
                <div className="text-sm text-theme-muted">Choose junction-based or route-based event.</div>
              </div>

              <select
                value={newEvent.locationMode}
                onChange={(e) =>
                  setNewEvent((p) => ({
                    ...p,
                    locationMode: e.target.value as LocationMode,
                    // clear the other id to avoid ambiguity
                    junction_id: e.target.value === 'junction' ? p.junction_id : '',
                    route_id: e.target.value === 'route' ? p.route_id : '',
                  }))
                }
                className="rounded-xl border border-[var(--color-border)] bg-theme-surface px-3 py-2 text-sm text-theme-text
                           focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.25)]"
              >
                <option value="junction">Junction</option>
                <option value="route">Route</option>
                {/* If you actually want custom, also add:
                    <option value="custom">Custom</option>
                 */}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {newEvent.locationMode === 'junction' ? (
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">Junction ID *</label>
                  <input
                    value={newEvent.junction_id}
                    onChange={(e) => setNewEvent((p) => ({ ...p, junction_id: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-theme-text
                               focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
                    placeholder="e.g. J001"
                  />
                </div>
              ) : newEvent.locationMode === 'route' ? (
                <div>
                  <label className="block text-sm font-medium text-theme-text mb-2">Route ID *</label>
                  <input
                    value={newEvent.route_id}
                    onChange={(e) => setNewEvent((p) => ({ ...p, route_id: e.target.value }))}
                    className="w-full rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-theme-text
                               focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
                    placeholder="e.g. R003"
                  />
                </div>
              ) : (
                <div />
              )}

              <div>
                <label className="block text-sm font-medium text-theme-text mb-2">Location description *</label>
                <input
                  value={newEvent.location_description}
                  onChange={(e) => setNewEvent((p) => ({ ...p, location_description: e.target.value }))}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-theme-text
                             focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
                  placeholder="e.g. MG Road between Trinity Circle and Cubbon Park"
                />
              </div>
            </div>
          </div>

          {/* Impact */}
          <div>
            <label className="block text-sm font-medium text-theme-text mb-2">
              Affected routes (comma-separated) *
            </label>
            <input
              value={affectedRoutesText}
              onChange={(e) => setNewEvent((p) => ({ ...p, affected_routes: parseCsv(e.target.value) }))}
              className="w-full rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-theme-text
                         focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
              placeholder="e.g. R001, R004"
            />
          </div>

          {/* Authorities */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-1">
              <label className="block text-sm font-medium text-theme-text mb-2">Authorities field *</label>
              <select
                value={newEvent.authoritiesMode}
                onChange={(e) =>
                  setNewEvent((p) => ({
                    ...p,
                    authoritiesMode: e.target.value as AuthoritiesMode,
                  }))
                }
                className="w-full rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-theme-text
                           focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
              >
                {/* Matches the shared AuthoritiesMode from app/types/events.ts */}
                <option value="authorities">authorities</option>
                <option value="custom">custom</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-theme-text mb-2">
                Authorities (comma-separated) *
              </label>
              <input
                value={authoritiesText}
                onChange={(e) => setNewEvent((p) => ({ ...p, authorities: parseCsv(e.target.value) }))}
                className="w-full rounded-xl border border-[var(--color-border)] bg-theme-surface px-4 py-2 text-theme-text
                           focus:outline-none focus:ring-2 focus:ring-[rgba(var(--color-primary-500-rgb),0.30)]"
                placeholder="e.g. BBMP, Bangalore Traffic Police"
              />
            </div>
          </div>

          {/* Optional: keep your existing shortcut */}
          <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(var(--color-primary-500-rgb),0.05)] p-4">
            <label className="block text-sm font-medium text-theme-text mb-2">Block Streets</label>
            <button
              type="button"
              onClick={() => (window.location.href = '/dashboard/simulation')}
              className="w-full px-4 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-500)]
                         text-white rounded-xl transition-colors shadow-sm font-medium flex items-center justify-center gap-2"
            >
              <span>Go to Simulation to Block Streets</span>
            </button>
            <p className="mt-2 text-sm text-theme-muted">
              Click streets on the simulation map to block them for this event
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[var(--color-border)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-theme-text border border-[var(--color-border)] bg-theme-surface
                       hover:bg-[rgba(var(--color-primary-500-rgb),0.06)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="px-6 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-500)]
                       text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={!canSubmit ? 'Fill all required fields' : undefined}
          >
            Add Event
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * OPTIONAL:
 * Helper to convert NewEventState -> your JSON event shape.
 */
export function toEventPayload(form: NewEventState) {
  const location =
    form.locationMode === 'junction'
      ? { junction_id: form.junction_id.trim(), description: form.location_description.trim() }
      : form.locationMode === 'route'
        ? { route_id: form.route_id.trim(), description: form.location_description.trim() }
        : { description: form.location_description.trim() };

  const impact: any = {
    affected_routes: form.affected_routes,
    // If your API requires a number always, enforce it here instead of allowing ''.
    estimated_delay_min: form.estimated_delay_min === '' ? 0 : Number(form.estimated_delay_min),
  };

  const base: any = {
    id: form.id.trim(),
    title: form.title.trim(),
    description: form.description.trim(),
    type: form.type,
    severity: form.severity,
    location,
    start_time: form.start_time,
    end_time: form.end_time || undefined,
    status: form.status,
    impact,
  };

  if (form.authoritiesMode === 'authorities') {
    base.authorities = form.authorities;
  } else {
    // If you truly support "custom", your backend must know which field to map it to.
    // Otherwise remove 'custom' from AuthoritiesMode in app/types/events.ts.
    base.authorities = form.authorities;
  }

  return base;
}
