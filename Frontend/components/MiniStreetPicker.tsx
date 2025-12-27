'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';

type StreetWithCoords = {
  name: string;
  coordinates: [number, number][]; // [lat, lng]
};

type StreetsApiResponse = {
  streets_with_coords: StreetWithCoords[];
};

type Props = {
  isActive: boolean; // visible tab
  value: string[];
  onChange: (next: string[]) => void;

  title?: string;
  subtitle?: string;

  /** Optional: if you want auto-fill. */
  onHintText?: (hint: string) => void;

  /** Optional view override */
  initialView?: { center: [number, number]; zoom: number };
};

export default function MiniStreetPicker({
  isActive,
  value,
  onChange,
  title = 'Select affected streets',
  subtitle = 'Click a street to add/remove it. Selected streets appear in the list.',
  onHintText,
  initialView = { center: [52.5255, 13.39], zoom: 15 },
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const linesRef = useRef<Record<string, L.Polyline>>({});

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const styles = useMemo(() => {
    const base = {
      normal: { color: '#3B82F6', opacity: 0.35, weight: 4 } as L.PathOptions,
      hover: { opacity: 0.7, weight: 5 } as L.PathOptions,
      selected: { color: '#EF4444', opacity: 0.95, weight: 6 } as L.PathOptions,
    };
    return base;
  }, []);

  const toggle = (id: string) => {
    const next = new Set(value);
    if (next.has(id)) next.delete(id);
    else next.add(id);

    const arr = Array.from(next);
    onChange(arr);

    if (onHintText) {
      onHintText(arr.length ? `Selected ${arr.length} street(s) from map` : '');
    }
  };

  // Init map once
  useEffect(() => {
    if (!containerRef.current) return;
    if (mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
      minZoom: 13,
      maxZoom: 19,
    }).setView(initialView.center, initialView.zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      linesRef.current = {};
    };
  }, [initialView.center, initialView.zoom]);

  // Leaflet inside modal/tab: invalidateSize after visible so it renders properly
  useEffect(() => {
    if (!isActive) return;
    const t = setTimeout(() => mapRef.current?.invalidateSize(), 120);
    return () => clearTimeout(t);
  }, [isActive]);

  // Load streets when active (once)
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!isActive) return;
      if (!mapRef.current) return;
      if (Object.keys(linesRef.current).length > 0) return;

      setLoading(true);
      setLoadError(null);

      try {
        const res = await fetch('/api/streets', { method: 'GET' });
        if (!res.ok) throw new Error(`Failed to load streets (${res.status})`);
        const data = (await res.json()) as StreetsApiResponse;

        const streets = data.streets_with_coords || [];
        if (!Array.isArray(streets) || streets.length === 0) throw new Error('No streets returned');

        if (cancelled) return;

        streets.forEach((s) => {
          if (!s?.name || !Array.isArray(s.coordinates) || s.coordinates.length < 2) return;

          const id = s.name;

          const poly = L.polyline(s.coordinates, styles.normal).addTo(mapRef.current!);

          poly.on('mouseover', function () {
            if (!selectedSet.has(id)) this.setStyle(styles.hover);
          });

          poly.on('mouseout', function () {
            const isSel = selectedSet.has(id);
            this.setStyle(isSel ? styles.selected : styles.normal);
          });

          poly.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            toggle(id);
          });

          linesRef.current[id] = poly;
        });

        // fit to all streets once (nicer UX)
        const all = Object.values(linesRef.current);
        if (all.length) {
          const group = L.featureGroup(all);
          mapRef.current!.fitBounds(group.getBounds().pad(0.12));
        }

        setTimeout(() => mapRef.current?.invalidateSize(), 160);
      } catch (err: any) {
        if (!cancelled) setLoadError(err?.message || 'Failed to load streets');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isActive, selectedSet, styles, value]);

  // Sync styles when selection changes
  useEffect(() => {
    Object.entries(linesRef.current).forEach(([id, poly]) => {
      const isSel = selectedSet.has(id);
      poly.setStyle(isSel ? styles.selected : styles.normal);
      if (isSel) poly.bringToFront(); // make selection visually pop [web:1669]
    });
  }, [selectedSet, styles]);

  const clearAll = () => onChange([]);

  return (
    <div className="rounded-2xl border border-[var(--color-border)] overflow-hidden">
      {/* Colorful header (break monotony) */}
      <div
        className="px-4 py-3 border-b border-[var(--color-border)]"
        style={{
          background:
            'linear-gradient(90deg, rgba(var(--color-primary-500-rgb),0.14), rgba(var(--color-primary-500-rgb),0.04))',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-theme-text">{title}</div>
            <div className="text-sm text-theme-muted">{subtitle}</div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className="px-2.5 py-1 rounded-full text-xs font-semibold"
              style={{
                backgroundColor: 'rgba(var(--color-primary-500-rgb),0.12)',
                color: 'var(--color-primary)',
                border: '1px solid rgba(var(--color-primary-500-rgb),0.25)',
              }}
            >
              {value.length} selected
            </span>

            <button
              type="button"
              onClick={clearAll}
              className="px-3 py-2 rounded-xl border border-[var(--color-border)] bg-theme-surface text-sm text-theme-text
                         hover:bg-[rgba(var(--color-primary-500-rgb),0.06)] transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-theme-surface">
        <div
          ref={containerRef}
          className="w-full"
          style={{ height: 280 }}
        />
      </div>

      {/* Footer area: feedback + chips */}
      <div className="px-4 py-4 border-t border-[var(--color-border)] bg-theme-bg">
        {loading && <div className="text-sm text-theme-muted">Loading streets…</div>}
        {loadError && <div className="text-sm text-[var(--color-error)]">{loadError}</div>}

        <div className="mt-2">
          <div className="text-sm font-semibold text-theme-text">Selected streets</div>

          {value.length === 0 ? (
            <div className="mt-2 text-sm text-theme-muted">
              Tip: zoom in and click on a street segment to select it.
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {value.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggle(id)}
                  className="px-3 py-1.5 rounded-full text-sm border transition-colors"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.10)',
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                    color: 'var(--color-text)',
                  }}
                  title="Click to remove"
                >
                  {id} ×
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
