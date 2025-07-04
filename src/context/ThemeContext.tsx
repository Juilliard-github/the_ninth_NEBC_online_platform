'use client'


import { createContext, useContext, useState, useEffect } from 'react'


type Theme = 'light' | 'dark'


interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}


const ThemeContext = createContext<ThemeContextType | undefined>(undefined)


export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme 必須在 ThemeProvider 中使用')
  return context
}


export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('light')


  useEffect(() => {
    // 可從 localStorage 或系統設定初始化
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved === 'dark' || saved === 'light') {
      setTheme(saved)
    }
  }, [])


  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }


  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={theme === 'dark' ? 'dark' : ''}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}