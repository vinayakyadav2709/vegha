'use client'

import { ReactNode, useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import { GRADIENT_DARK, GRADIENT_LIGHT } from './ui'
import { useTheme } from 'next-themes'

type Props = {
  children: ReactNode
}

export default function LayoutShell({ children }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const { theme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const isDark = mounted && theme === 'dark'

  return (
    <div
      className="min-h-screen"
      style={{ background: isDark ? GRADIENT_DARK : GRADIENT_LIGHT }}
    >
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className={`${collapsed ? 'md:pl-16' : 'md:pl-64'} transition-all`}>
        {/* top header */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-screen mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                aria-label="Open navigation"
                onClick={() => setSidebarOpen(true)}
                className="md:hidden inline-flex items-center justify-center rounded-md p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Menu className="h-6 w-6" />
              </button>

              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Vegha</span>
                <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400">Traffic Dashboard</span>
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {/* right-side controls placeholder */}
            </div>
          </div>
        </header>

        <main className="max-w-screen mx-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}