'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from './button'
import RatingPopup from './RatingPopup'
import { useOnlineUserCount } from '@/hooks/useOnlineUserCount'
import { useVisitorStats } from '@/hooks/useVisitorStats'
import { useAuth } from '@/hooks/useAuth'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
export default function Header() {
  const [currentTime, setCurrentTime] = useState<string | null>(null)
  const [isPopupVisible, setIsPopupVisible] = useState(false)
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const { totalVisitors } = useVisitorStats()
  const onlineCount = useOnlineUserCount()
  const { user, role, theme, setTheme, signIn, signOut } = useAuth()

  useEffect(() => {
    setCurrentTime(new Date().toLocaleString()) // Update the time on mount
    const timer = setInterval(() => setCurrentTime(new Date().toLocaleString()), 1000)
    return () => clearInterval(timer) // Clean up on unmount
  }, [])


  useEffect(() => {
    const fetchRating = async () => {
      const snap = await getDoc(doc(db, 'analytics', 'ratings'))
      const data = snap.data()
      if (data) {
        const avg = data.count === 0 ? 0 : data.total / data.count
        setAverageRating(avg)
      }
    }
    fetchRating()
  }, [])

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(newTheme) // 設定全局 theme
  }

  return (
    <header className={`sticky top-0 z-50 border-b ${theme === 'dark' ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <h1 className="text-5xl font-serif font-bold text-center">NEBC Learning Platform</h1>
      <p className="text-center text-sm mt-2">
        {currentTime && `⏰ ${currentTime}`}
        <span className="mx-2">🔥 在線人數：{onlineCount}</span>
        <span className="mx-2">🌐 累積訪問：{totalVisitors}</span>
        <span className="mx-2">⭐ 評價：{averageRating?.toFixed(1) ?? '😆'}</span>
      </p>
      <div className="text-center mt-2 text-md">
        {user ? (
          <>
          👋 歡迎 {user.name} 
          <Link href="/profile" className='ml-4 mr-2'>⚙️ 設定</Link>
          <Button onClick={signOut}>登出</Button>
          </>
        ) : (
          <Button 
            onClick={signIn}
            className='relative py-1 px-3 rounded-md overflow-hidden'
          >
            <span className='z-10'>登入</span>
            <span className="absolute inset-0 border-3 border-transparent rounded-md animate-borderGlow"></span>
          </Button>
        )}
        <Button onClick={handleThemeToggle}>🎨 切換主題</Button>
        <Button onClick={() => setIsPopupVisible(true)}>😎 給評價</Button>
      </div>
      <div className={`relative z-0 flex-grow flex flex-col ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-zinc-100/50 text-black'}`}>
        <nav className={`sticky z-50 p-2 shadow flex gap-4 justify-center`}>
          <Link href="/">📢 最新消息</Link>
          <Link href="/guestbook">💬 留言板</Link>
          <Link href="/leaderboard">🏅 排行榜</Link>
          {role === 'admin' && (
            <div className="flex gap-4">
              <Link href="/admin/dashboard">🔐 管理員後台</Link>
              <Link href="/admin/questions/list">📋 題目清單</Link>
              <Link href="/admin/questions/new">➕ 新增題目</Link>
              <Link href="/admin/questions/trash">🗑️ 題目垃圾桶</Link>
              <Link href="/admin/exams/list">📄 考試清單</Link>
              <Link href="/admin/exams/new">💯 建立新考試</Link>
              <Link href="/admin/exams/trash">🗑️ 考試垃圾桶</Link>
            </div>
          )}
          {role === 'user' && (
            <div className="flex gap-4">
              <Link href="/user/practice-list#not-yet-open">⏳ 尚未開放</Link>
              <Link href="/user/practice-list#open-now">🟢 開放中</Link>
              <Link href="/user/practice-list#expired">⛔ 已結束</Link>
              <Link href="/user/practice-list#highschool">🏫 高中練習</Link>
              <Link href="/user/favorites/manage">⭐ 錯題收藏</Link>
            </div>
          )}
        </nav>
      </div>
     {isPopupVisible && <RatingPopup onRatingSubmit={() => setIsPopupVisible(false)} />}
    </header>
  )
}
