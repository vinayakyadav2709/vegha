import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import './globals.css'
import LayoutWrapper from '@/components/LayoutWrapper'
import 'leaflet/dist/leaflet.css'


const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Vegha',
  description: 'Smart Traffic Management Prototype',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
           attribute="class"
  defaultTheme="dark"   
  enableSystem={false}  
  disableTransitionOnChange
        >
          <LayoutWrapper>{children}</LayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  )
}