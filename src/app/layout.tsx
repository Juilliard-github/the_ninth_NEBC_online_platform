import './globals.css' // ✅ 確保 Tailwind 有載入
import type { Metadata } from 'next'
import LayoutClient from './LayoutClient'
import { ThemeProvider } from '@/hooks/ThemeContext'

export const metadata: Metadata = {
  title: 'NEBC 題庫系統',
  description: '學習、練習、挑戰的平台',
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW en">
      <link rel="preload" href="/fonts/ChenYuluoyan-20-Thin.woff2" as="font" type="font/woff2" crossOrigin="anonymous"></link>
      <link rel="preload" href="/fonts/Iansui-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous"></link>
      <body>
        <ThemeProvider>
          <LayoutClient>
            {children}
          </LayoutClient>
        </ThemeProvider>
      </body>
    </html>
  )
}