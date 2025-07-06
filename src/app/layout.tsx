import './globals.css' 
import type { Metadata } from 'next'
import LayoutClient from './LayoutClient'
import { ThemeProvider } from '@/hooks/ThemeContext'
import Head from 'next/head'
export const metadata: Metadata = {
  title: 'NEBC 題庫系統',
  description: '學習、練習、挑戰的平台'
}


export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <Head>
        <link rel="preload" href="/fonts/ChenYuluoyan-2.0-Thin.woff2" as="font" type="font/woff2" crossOrigin="anonymous"></link>
        <link rel="preload" href="/fonts/Iansui-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous"></link>
      </Head>
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