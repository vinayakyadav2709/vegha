'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Map,
  Calendar,
  Truck,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
  Cpu,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  TRANSITION_BASE,
} from './ui';

type Props = {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
};

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Map', href: '/dashboard/map', icon: Map },
  { name: 'Simulation', href: '/dashboard/simulation', icon: Cpu },
  { name: 'Events', href: '/dashboard/events', icon: Calendar },
  { name: 'Emergency Vehicles', href: '/dashboard/emergency', icon: Truck },
  { name: 'Predictions', href: '/dashboard/predictions', icon: TrendingUp },
];

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  collapsed,
  setCollapsed,
}: Props) {
  const pathname = usePathname();

  // theme detection to choose active color per light/dark mode
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  // chosen so:
  // - light mode: darker blue (700)
  // - dark mode: lighter blue (500)
  const activeRgbToken = isDark
    ? '--color-primary-500-rgb'
    : '--color-primary-700-rgb';

  const primaryColor = `rgb(var(${activeRgbToken}))`;
  const surfaceColor = 'var(--color-text)';
  const mutedColor = 'var(--color-text-muted)';

  const desktopWidth = collapsed
    ? SIDEBAR_WIDTH_COLLAPSED
    : SIDEBAR_WIDTH_EXPANDED;

  const activeBgExpanded = `linear-gradient(90deg, rgba(var(${activeRgbToken}), 0.12), rgba(var(${activeRgbToken}), 0.04))`;
  const activeBgCollapsed = `rgba(var(${activeRgbToken}), 0.10)`;

  const sideBarStyle: React.CSSProperties = {
   backgroundImage:
      'linear-gradient(180deg, rgba(var(--sidebar-bg-from),1), rgba(var(--sidebar-bg-to),1))',
    color: surfaceColor,

    // subtle right divider (like navbar’s bottom divider)
    boxShadow:
      'inset -1px 0 0 color-mix(in srgb, var(--color-border) 35%, transparent',
    
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-50 md:hidden pointer-events-none ${
          sidebarOpen ? 'pointer-events-auto' : ''
        }`}
      >
        <div
          className={`fixed left-0 right-0 top-0 bottom-0 bg-black/50 transition-opacity ${
            sidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden={!sidebarOpen}
        />
        <aside
          className={`fixed top-0 left-0 z-50 w-72 max-w-full transform shadow-2xl transition-transform ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(var(--sidebar-bg-from),1), rgba(var(--sidebar-bg-to),1))',
            color: surfaceColor,
          }}
          aria-hidden={!sidebarOpen}
          role="dialog"
          aria-label="Navigation"
        >
          <div
            className="h-16 flex items-center px-4 "
            style={{ borderColor: 'rgba(var(--border),0.12)' }}
          >
            <span
              className="text-lg font-semibold tracking-tight"
              style={{ color: surfaceColor }}
            >
              Vegha
            </span>
            <button
              aria-label="Close menu"
              className="ml-auto p-2 rounded-md hover:bg-[rgba(255,255,255,0.03)] transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" style={{ color: surfaceColor }} />
            </button>
          </div>

          <nav className="px-2 py-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;

              const baseCls =
                'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition';
              const mobileStyle: React.CSSProperties | undefined = isActive
                ? {
                    color: primaryColor,
                    background: activeBgExpanded,
                    boxShadow: '0 1px 0 rgba(0,0,0,0.04)',
                  }
                : undefined;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={baseCls}
                  style={mobileStyle}
                >
                  <item.icon
                    className="mr-3 h-5 w-5 flex-shrink-0 transition-transform duration-150"
                    style={{ color: isActive ? primaryColor : mutedColor }}
                  />
                  <span
                    style={{
                      color: isActive ? primaryColor : surfaceColor,
                    }}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>
      </div>

      {/* Desktop */}
      <aside
        className={`hidden md:flex md:fixed md:top-0 md:left-0 md:bottom-0 md:flex-col ${
          collapsed ? 'w-16' : 'w-64'
        } ${TRANSITION_BASE}`}
        style={sideBarStyle}
        aria-hidden={false}
      >
        <div
          className="flex flex-col flex-grow overflow-y-auto text-surface 
           h-full"
          style={
            sideBarStyle
          }
        >
          <div
            className="relative flex h-16 items-center px-3 "
            style={
              {
                  boxShadow: `inset 0 -5px 0 color-mix(in srgb, var(--color-border) 35%, transparent)`,
     
              }
            }
          >
            <div className="flex items-center gap-3">
              {collapsed ? (
                <button
                  aria-label="Expand sidebar"
                  onClick={() => setCollapsed(false)}
                  className="p-2 rounded-md hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  <ChevronRight
                    className="w-5 h-5"
                    style={{ color: surfaceColor }}
                  />
                </button>
              ) : (
                <>
                  <div className="flex items-center justify-center rounded-md w-8 h-8">
                    <span
                      className="font-semibold"
                      style={{ color: surfaceColor }}
                    >
                      V
                    </span>
                  </div>
                </>
              )}
            </div>

            {!collapsed && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <button
                  aria-label="Collapse navigation"
                  title="Collapse"
                  onClick={() => setCollapsed(true)}
                  className="p-2 rounded-md hover:bg-[rgba(255,255,255,0.03)] transition-colors"
                >
                  <ChevronLeft
                    className="w-4 h-4"
                    style={{ color: surfaceColor }}
                  />
                </button>
              </div>
            )}
          </div>

          <nav className="flex-1 px-2 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;

              const base = [
                'group',
                'relative',
                'flex',
                'w-full',
                'py-2.5',
                'text-sm',
                'font-medium',
                'transition',
                'duration-150',
                'ease-in-out',
              ].join(' ');

              const collapsedPadding = collapsed
                ? 'justify-center px-0'
                : 'items-center px-2';

              const activeStyle: React.CSSProperties | undefined = isActive
                ? {
                    color: primaryColor,
                    background: collapsed
                      ? activeBgCollapsed
                      : activeBgExpanded,
                    borderLeftWidth: collapsed ? undefined : 4,
                    borderLeftStyle: collapsed ? undefined : 'solid',
                    borderLeftColor: collapsed ? undefined : primaryColor,
                    paddingLeft: collapsed ? undefined : '0.75rem',
                  }
                : undefined;

              const linkClass = `${base} ${collapsedPadding}`;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={linkClass}
                  aria-current={isActive ? 'page' : undefined}
                  style={activeStyle}
                >
                  <div
                    className={`relative flex items-center w-full ${
                      collapsed ? 'justify-center' : ''
                    }`}
                  >
                    <item.icon
                      className="h-5 w-5 flex-shrink-0"
                      style={{
                        color: isActive ? primaryColor : mutedColor,
                        marginRight: collapsed ? undefined : '0.75rem',
                      }}
                    />
                    {!collapsed && (
                      <span
                        style={{
                          color: isActive ? primaryColor : surfaceColor,
                        }}
                        className="ml-1"
                      >
                        {item.name}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div
            className="px-3 py-4 border-t"
            style={{ borderColor: 'rgba(var(--border),0.08)' }}
          >
            <div
              className={`flex items-center gap-3 ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <div className="text-xs" style={{ color: mutedColor }}>
                {collapsed ? '' : 'v1.0.0'}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
