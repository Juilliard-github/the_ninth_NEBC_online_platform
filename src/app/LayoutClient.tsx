'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/button'
import RatingPopup from '@/components/RatingPopup'
import { useOnlineUserCount } from '@/hooks/useOnlineUserCount'
import { useVisitorStats, useVisitorCount } from '@/hooks/useVisitorStats'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'
import { sha256 } from 'js-sha256'

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [isPopupVisible, setIsPopupVisible] = useState(false)
  const [averageRating, setAverageRating] = useState<number>(0)
  const { totalVisitors } = useVisitorStats()
  const { incrementVisitorCount } = useVisitorCount()
  const onlineCount = useOnlineUserCount()
  const [userId, setUserId] = useState<string>('')
  const [name, setName] = useState<string>('')
  const [role, setRole] = useState<string>('')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [deleted, setDeleted] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [isAdminPromptVisible, setIsAdminPromptVisible] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [errorCount, setErrorCount] = useState<number>(0) 
  const [isPasswordPromptVisible, setIsPasswordPromptVisible] = useState(false)
  const router = useRouter()
  const balloonContainerRef = useRef<HTMLDivElement>(null)


  const generateBalloon = () => {
    if (!balloonContainerRef.current) return

    const balloon = document.createElement('div')
    const size = Math.random() * 10 + 5
    const left = Math.random() * 100
    const delay = Math.random() * 2 

    balloon.className = 'absolute bottom-0 rounded-full opacity-80'
    balloon.style.width = `${size}px`
    balloon.style.height = `${size}px`
    balloon.style.left = `${left}%`
    balloon.style.animationDelay = `${delay}s`
    balloon.style.animation = `floatUp 5s ease-out infinite, colorShift 5s infinite`
    balloonContainerRef.current.appendChild(balloon)
    setTimeout(() => {balloon.remove()}, 5000)
  }

  useEffect(() => {
    const balloonInterval = setInterval(generateBalloon, 500) 
    return () => clearInterval(balloonInterval) 
  }, [])

  useEffect(() => {
    incrementVisitorCount()
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userRef = doc(db, 'users', fbUser.uid)
        const userSnap = await getDoc(userRef)
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: fbUser.uid,
            name: fbUser.displayName || '匿名',
            nickname: '',
            email: fbUser.email || '',
            role: 'pending',
            totalScore: 0,
            correctCount: 0,
            totalQuestions: 0,
            correctRate: 0,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            lastRatedAt: serverTimestamp(),
            deleted: false
          })
          setUserId(fbUser.uid)
          setName(fbUser.displayName || '匿名')
          setRole('pending')
          setDeleted(false)
          setErrorCount(0)
          setIsAdminPromptVisible(true)
        } else {
          const data = userSnap.data()
          await updateDoc(doc(db, 'users', data.uid), {lastLogin: serverTimestamp()})
          setUserId(data.uid)
          setName(data.name)
          setRole(data.role || 'pending')
          setTheme(data.theme || 'light')
          setDeleted(data.deleted)
          localStorage.setItem('theme', data.theme || 'light')

          if (role === 'pending') {
            toast.info('您的帳號正在等待管理員審核')
          }
          if (deleted === true) {
            toast.info('您的帳號已遭刪除，請聯絡管理員。')
            setRole('')
          }
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signInWithGoogle = async () => {
    setPassword('')
    setIsAdminPromptVisible(false)
    setIsPasswordPromptVisible(false)
    await signOut(auth)
    setName('')
    setRole('')
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({prompt: 'select_account'})
    const result = await signInWithPopup(auth, provider)
    toast.success('成功登入')
    return result.user
  }

  const signOutUser = async () => {
    await signOut(auth)
    setUserId('')
    setName('')
    setRole('')
    setPassword('')
    setIsPasswordPromptVisible(false)
    toast.success('已成功登出')
    router.push('/')
  }

  const handleAdminSelection = () => {
    setIsAdminPromptVisible(false)
    setIsPasswordPromptVisible(true)
  }

  const handleNotAdminSelection = () => {
    toast.info('您的帳號正在等待管理員審核')
    setIsAdminPromptVisible(false)
    setIsPasswordPromptVisible(false)
  }

  const handlePasswordSubmit = async () => {
    const adminPassword = 'fb5f56346d9c89316d0d2a30398c00233f7a6cfbd1ac80d641cf14fc4f1df0ec'
    if (sha256(password) === adminPassword) {
      if (!userId) {
        toast.error('用戶資料無效，請重新登錄！')
        return
      }
      try {
        await updateDoc(doc(db, 'users', userId), {role: 'admin'})
        setRole('admin')
        setIsPasswordPromptVisible(false)
        setErrorCount(0) // 密碼正確時，重置錯誤次數
        setPassword('')
        toast.success('您已成為管理員！')
      } catch (e) {
        toast.error('發生錯誤，請稍後再試。')
      }
    } else {
      if (errorCount < 2) {
        setErrorCount(prev => prev + 1)
        toast.error('密碼錯誤，請重試！')
        setPassword('')
      } else {
        toast.error('已經輸入錯誤密碼超過三次，帳號遭刪除！如有問題請聯絡管理員。')
        setPassword('')
        setIsPasswordPromptVisible(false)
        setDeleted(true)
        setRole('')
        await updateDoc(doc(db, 'users', userId), {deleted: true, role: ''})
        signOutUser()
        await signOut(auth)
        setUserId('')
        router.push('/')
        return
      }
    }
  }

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
    <div className={`relative z-0 min-h-screen flex flex-col transition-all duration-500 ${
        theme === 'dark'
        ? "bg-[url('/img/dark-bg.png')]"
        : "bg-[url('/img/home-bg.png')]"
      } bg-cover bg-fixed bg-[position:center_80px]`}
    >
      <Toaster richColors position='bottom-right'/>
      <div className={`absolute inset-0 z-0 ${theme === 'dark' ? 'bg-black/80' : 'bg-white/90'}`} />
      <div ref={balloonContainerRef} 
           className="pointer-events-none fixed inset-0 z-10 overflow-hidden" 
      />
      <header className={`sticky top-0 z-50 ${theme === 'dark' ? 'text-white bg-black' : 'text-black bg-white'}`}>
        <h1 className="text-5xl font-serif font-bold text-center">NEBC Learning Platform</h1>
        <p className="text-center text-sm mt-2">
          <>
            <span className="ml-3">🔥 在線人數 {onlineCount} 人</span>
            <span className="ml-3">🌐 累積訪問 {totalVisitors} 次</span>
            <span className="ml-3">⭐ 網站評價 {averageRating?.toFixed(1) ?? '😆'}</span>
          </>
        </p>
        <div className="text-center text-md mt-2">
          <Button onClick={handleThemeToggle}>🎨 切換主題</Button>
          <Button onClick={() => setIsPopupVisible(true)}>😎 給予星級</Button>
          {userId ? (
            <>
              <Button 
                onClick={signOutUser}
                className='relative py-1 px-3 rounded-md overflow-hidden'
              >
                <span className='z-10'>登出</span>
                <span className="absolute inset-0 border-3 border-transparent rounded-md animate-borderGlow"></span>
              </Button>
              <Link href="/profile" className='mx-2 my-4 rounded-md'>⚙️ 設定</Link>
              <span>👋 歡迎 {name} </span>
            </>
          ) : (
            <Button 
              onClick={signInWithGoogle}
              className='relative py-1 px-3 rounded-md overflow-hidden'
            >
              <span className='z-10'>登入</span>
              <span className="absolute inset-0 border-3 border-transparent rounded-md animate-borderGlow"></span>
            </Button>
          )}
        </div>
      </header>
      <div className={`relative z-0 flex-grow flex flex-col`}>
        <nav className={`sticky top-30 z-50 p-2 shadow flex gap-4 justify-center border-double border-b ${theme === 'dark' ? 'bg-black/80' : 'bg-white/90'}`}>
          <Link href="/">🏠︎ 首頁</Link>
          <Link href="/news">📢 最新消息</Link>
          <Link href="/guestbook">💬 留言板</Link>
          <Link href="/leaderboard">🏅 排行榜</Link>
          {role === 'admin' && (
            <div className="flex gap-4">
              <Link href="/admin/dashboard">🔐 管理員後台</Link>
              <Link href="/admin/questions/list">📋 題目清單</Link>
              <Link href="/admin/questions/new">➕ 新增題目</Link>
              <Link href="/admin/questions/trash">🗑️ 題目垃圾桶</Link>
              <Link href="/admin/exams/list">📄 考試清單</Link>
              <Link href="/admin/exams/new">💯 新增考試</Link>
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
        {isPopupVisible && <RatingPopup onRatingSubmit={() => setIsPopupVisible(false)} />}
        <main className="flex-grow relative p-6">
          <div className={`${theme === 'dark' ? 'text-white' : 'text-black'} p-0 rounded-none shadow-none`}>
            {isAdminPromptVisible && (
              <div className="shadow item-center text-center">
                <p>請選擇是否為管理員</p>
                <div className='p-2 flex flex-grow justify-center gap-2'>
                  <Button variant="undo" onClick={handleAdminSelection} className="admin-btn">是</Button>
                  <Button variant="view" onClick={handleNotAdminSelection} className="admin-btn">否</Button>
                </div>
              </div>
            )}
            {isPasswordPromptVisible && (
              <div className="shadow text-center item-center">
                <p>請輸入密碼：</p>
                <div className='p-2 flex flex-grow justify-center gap-2'>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="管理員密碼"
                  className="px-2 item-center"
                />
                {passwordError && <p>{passwordError}</p>}
                <Button variant="submit" onClick={handlePasswordSubmit}>提交</Button>
              </div>
              </div>
            )}
            {children}
          </div>
        </main>
        <footer className={`text-center text-sm py-4 ${theme === 'dark' ? 'bg-slate-800/50 text-white' : 'bg-zinc-100/50 text-black'}`}>
          <span className='ml-2'>Ⓒ 2025 NEBC Learning Platform</span> 
          <span className='ml-2'>Ⓒ 2025 Juilliard Wynn.</span>
          <span className='ml-2'>All rights reserved.</span>
          <Link href="/about" className={`ml-2 ${theme === 'dark' ? 'text-zinc-400' : 'text-blue-800'}`}>ℹ️關於</Link>
        </footer>
      </div>
    </div>
  )
}
