import { Ballon } from '@/components/balloon'
import Link from 'next/link'
import Stats from '@/components/stats'
import { TopNav } from '@/components/topNav'
import { ThemeSwitch } from '@/components/themeSwitch'
import { SideNav } from '@/components/sideNav'
import { Toaster } from 'sonner'

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <div className='body'>
      <div className="relative z-0 min-h-screen flex flex-col dark:bg-[url('/img/dark-bg.png')] bg-[url('/img/home-bg.png')] bg-cover bg-fixed bg-[position:center]">
        <div className='absolute z-0 inset-0 dark:bg-black/80 bg-white/90'/>
        <Toaster richColors closeButton position="bottom-right" />
        <Ballon/>
        <div className='header'>  
          <div className='title'>
            NEBC Learning Platform <ThemeSwitch/>
          </div>
          <TopNav/>      
          <SideNav/>
        </div>
        <main>
          {children}
        </main>
        <footer className="dark:bg-slate-800 bg-zinc-100">
          <Stats/>
          <div className='info'>
            <span className='g1'>Ⓒ 2025 NEBC Learning Platform</span> 
            <span className='g2'>Ⓒ 2025 Juilliard Wynn.</span>
            <span className='g3'>All rights reserved.</span>
            <Link href="/about" className="noEffect g4">ℹ️️</Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
