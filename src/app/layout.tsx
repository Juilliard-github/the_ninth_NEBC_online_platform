import './globals.css' 
import type { Metadata } from 'next'
import LayoutClient from './LayoutClient'
import { ThemeProvider } from './themeProvider'
import { headers } from 'next/headers'
 
export const metadata: Metadata = {
  title: 'NEBC 題庫系統',
  description: '學習、練習、挑戰的平台'
}

export default function RootLayout({
  children,}: {children: React.ReactNode}) {
  const nonce = async() => (await headers()).get('x-nonce')
  return (
    <html lang="zh-TW" nonce={`${nonce}`} suppressHydrationWarning>
      <head>
        <link rel="preload" href="/fonts/ChenYuluoyan-2.0-Thin.woff2" as="font" type="font/woff2" crossOrigin="anonymous"></link>
        <link rel="preload" href="/fonts/Iansui-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous"></link>
      </head>
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