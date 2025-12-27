'use client'

import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Sidebar from '@/components/Sidebar'
import { Menu } from 'lucide-react'
import { SIDEBAR_WIDTH_COLLAPSED, GRADIENT_DARK, GRADIENT_LIGHT, SIDEBAR_WIDTH_EXPANDED, NAV_HEIGHT } from './ui'
import { useTheme } from 'next-themes'

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith('/dashboard') || false

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const desktopOffset = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED

  // theme handling for background gradient
  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted && theme === 'dark'

  return (
    <div
      className="min-h-screen "
      style={{ background: isDark ? GRADIENT_DARK : GRADIENT_LIGHT }}
    >
      {isDashboard && (
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} collapsed={collapsed} setCollapsed={setCollapsed} />
      )}

      {isDashboard && (
        <div className="fixed top-4 left-4 z-50 md:hidden">
          <button aria-label="Open navigation" onClick={() => setSidebarOpen(true)} className="inline-flex items-center justify-center rounded-md p-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur text-gray-700 dark:text-gray-200 shadow-sm hover:shadow-md">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Navbar gets collapsed/isDashboard so it shifts with sidebar */}
      <Navbar collapsed={collapsed} isDashboard={isDashboard} />

      <div style={{ marginLeft: isDashboard ? desktopOffset : undefined, paddingTop: NAV_HEIGHT }} className="transition-all">
        <main className={isDashboard ? 'py-6 ' : ''}>
          <div className={isDashboard ? 'mx-auto max-w-screen px-4 sm:px-6 lg:px-8' : ''}>{children}</div>
        </main>
      </div>
    </div>
  )
}