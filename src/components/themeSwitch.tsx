'use client'
import { FiSun, FiMoon } from 'react-icons/fi'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/button'

export const ThemeSwitch = () => {
  const [mounted, setMounted] = useState(false)
  const { setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (resolvedTheme==='dark') {
    return ( 
    <Button className='rounded-full w-5 h-5 noEffect' onClick={() => {setTheme('light')}}>
      <FiSun/>
    </Button>
   )
  }
  if (resolvedTheme==='light') {
    return ( 
    <Button className='rounded-full w-5 h-5 noEffect' onClick={() => {setTheme('dark')}}>
      <FiMoon/>
    </Button>
    )
  }  
}