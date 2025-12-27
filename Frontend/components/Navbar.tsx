'use client';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';
import type React from 'react';
import { Sun, Moon, Bell, User } from 'lucide-react';
import {
  SIDEBAR_WIDTH_COLLAPSED,
  SIDEBAR_WIDTH_EXPANDED,
  NAV_HEIGHT,
   GRADIENT_LIGHT,
   GRADIENT_DARK,
  TRANSITION_BASE,
} from './ui';

export default function Navbar({
  collapsed = false,
  isDashboard = false,
}: {
  collapsed?: boolean;
  isDashboard?: boolean;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const isDark = mounted && theme === 'dark';

  const baseHeader =
    `fixed top-0 z-50 h-16 backdrop-blur  ${TRANSITION_BASE} ` +
    'flex items-center px-4 bg-nav-gradient nav-base';

  // compute left offset so header width adjusts with sidebar on desktop
  const leftOffset = isDashboard
    ? collapsed
      ? SIDEBAR_WIDTH_COLLAPSED
      : SIDEBAR_WIDTH_EXPANDED
    : '0';

  // subtle bottom border using theme variable (works in light & dark)
 const navStyle: React.CSSProperties = {
  left: leftOffset,
  right: 0,
  height: NAV_HEIGHT,
  boxShadow: `inset 0 -5px 0 color-mix(in srgb, var(--color-border) 35%, transparent)`,
};

  if (!mounted) {
    return (
      <nav
        className={`${baseHeader} ${ GRADIENT_LIGHT}`}
        style={navStyle}
      >
        <div className="flex items-center justify-between w-full max-w-screen mx-auto">
          <div className="flex items-center gap-4">
            <div className="text-lg font-semibold opacity-0">Vegha</div>
          </div>
          <div className="flex items-center gap-3">
            {/* skeleton chips use muted surface from theme */}
            <div className="w-8 h-8 rounded-full muted-bg" />
            <div className="w-8 h-8 rounded-full muted-bg" />
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className={`${baseHeader} ${
        isDark ?  GRADIENT_DARK :  GRADIENT_LIGHT
      }`}
      style={navStyle}
    >
      <div className="flex items-center justify-between w-full max-w-screen mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-3 navbar-brand">
            <span className="hidden sm:inline text-lg font-semibold text-theme-text">
              Vegha
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Notifications */}
          <button
            aria-label="Notifications"
            className="relative p-2 rounded-full hover:muted-bg focus-ring"
            title="Notifications"
          >
            <Bell className="w-5 h-5 text-theme-text" />
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium rounded-full bg-theme-primary text-theme-text">
              3
            </span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 rounded-full hover:muted-bg focus-ring"
            aria-label="Toggle dark mode"
            title="Toggle theme"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-theme-text" />
            ) : (
              <Moon className="w-5 h-5 text-theme-text" />
            )}
          </button>

          {/* Account */}
          <button
            aria-label="Account"
            title="Account"
            className="flex items-center gap-2 rounded-full px-2 py-1 hover:muted-bg focus-ring"
          >
            <div className="w-8 h-8 rounded-full bg-theme-surface flex items-center justify-center shadow-sm">
              <User className="w-4 h-4 text-theme-text" />
            </div>
            <span className="hidden sm:inline text-sm font-medium text-theme-text">
              Admin
            </span>
          </button>
        </div>
      </div>
    </nav>
  );
}
