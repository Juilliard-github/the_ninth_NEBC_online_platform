'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/button'
import RatingPopup from '@/components/RatingPopup'
import { useOnlineUserCount } from '@/hooks/useOnlineUserCount'
import { useVisitorStats, useVisitorCount } from '@/hooks/useVisitorStats'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider, User as FirebaseUser } from 'firebase/auth'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [currentTime, setCurrentTime] = useState<string | null>(null)
  const [isPopupVisible, setIsPopupVisible] = useState(false)
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const { totalVisitors } = useVisitorStats()
    const { incrementVisitorCount } = useVisitorCount();
  const onlineCount = useOnlineUserCount()
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null)
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdminPromptVisible, setIsAdminPromptVisible] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [errorCount, setErrorCount] = useState(0) 
  const [isPasswordPromptVisible, setIsPasswordPromptVisible] = useState(false)
  const router = useRouter()
  const ballContainerRef = useRef<HTMLDivElement>(null)

  const launchBalloon = () => {
      if (!ballContainerRef.current) return

      const balloon = document.createElement('div')
      const size = Math.random() * 5 + 10 // Random size between 12 and 28px
      const left = Math.random() * 100 // Random position from 0% to 100%

      // Apply random colors, and add color-shifting animation
      balloon.className = 'absolute bottom-0 rounded-full opacity-80'
      balloon.style.width = `${size}px`
      balloon.style.height = `${size}px`
      balloon.style.left = `${left}%`
      balloon.style.animation = 'floatUp 5s ease-out infinite, colorShift 5s infinite'

      // Append the balloon to the container
      ballContainerRef.current.appendChild(balloon)

      // Remove the balloon after 5 seconds (same as animation duration)
      setTimeout(() => {
        balloon.remove()
      }, 5000)  // The balloon will be removed after 5 seconds (time of floatUp)
    }

    useEffect(() => {
      // Launch a new balloon every 500ms
      const balloonInterval = setInterval(launchBalloon, 500)

      // Cleanup the interval when the component is unmounted
      return () => clearInterval(balloonInterval)
    }, []) 

  useEffect(() => {
    incrementVisitorCount()
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFbUser(firebaseUser)
      if (firebaseUser) {
        const userRef = doc(db, 'users', firebaseUser.uid)
        const userSnap = await getDoc(userRef)

        // 檢查是否有用戶資料
        if (!userSnap.exists()) {
          setIsAdminPromptVisible(true) // 顯示管理員選項
        } else {
          const data = userSnap.data()
          const fetchedRole = data?.role || 'pending' // 預設為 pending
          setRole(fetchedRole) // 設置角色
          setTheme(data?.theme || 'light')
          localStorage.setItem('theme', data?.theme || 'light')

          if (fetchedRole === 'pending') {
            toast.info('您的帳號正在等待管理員審核')
          }
          if (data.deleted === true) {
            toast.info('您的帳號已遭刪除，請聯絡管理員。')
            setRole('pending')
          }

          setUser({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || '',
            nickname: data?.nickname || '',
            role: fetchedRole,
            email: firebaseUser.email || '',
            avatarUrl: firebaseUser.photoURL || '',
            totalScore: data?.totalScore || 0,
            correctRate: data?.correctRate || 0,
            totalQuestions: data?.totalQuestions || 0,
            updatedAt: new Date(),
            createdAt: data?.createdAt || new Date(),
            lastRatedAt: data?.lastRatedAt || new Date(),
            theme: data?.theme || 'light',
            correctCount: data?.correctCount || 0,
            deleted: data?.deleted || false,
          })

        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const signIn = async () => {
    setPassword('')
    setIsAdminPromptVisible(false)
    setIsPasswordPromptVisible(false)
    await signOut(auth)
    setUser(null)
    setRole(null)
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    toast.success('成功登入')
    return result.user
  }

  const signOutUser = async () => {
    await signOut(auth)
    setUser(null)
    setRole(null)
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
    setIsAdminPromptVisible(false)
    setIsPasswordPromptVisible(false)
  }

  const handlePasswordSubmit = async () => {
    const adminPassword = 'nehsbiology'

    if (password === adminPassword) {
      if (!fbUser || !fbUser.uid) {
        toast.error('用戶資料無效，請重新登錄！')
        return
      }

      const userRef = doc(db, 'users', fbUser.uid)
      const userSnap = await getDoc(userRef)
      try {
        if (!userSnap.exists()) {
          // 如果資料不存在，創建新的用戶資料
          await setDoc(userRef, {
            uid: fbUser.uid,
            name: fbUser.displayName || '',
            nickname: fbUser.displayName || '',
            email: fbUser.email || '',
            role: 'admin',
            totalScore: 0,
            correctCount: 0,
            totalQuestions: 0,
            correctRate: 0,
            createdAt: new Date(),
            lastRatedAt: null,
            deleted: false
          })
        } else {
          // 如果資料存在，更新 role 為 admin
          await updateDoc(userRef, { role: 'admin' })
        }

        // 確保資料更新後再設置 user
        const updatedUserSnap = await getDoc(userRef)
        if (updatedUserSnap.exists()) {
          const updatedUser = updatedUserSnap.data()
          setUser({
            ...updatedUser,
            role: updatedUser?.role || 'pending',
          })
        }

        setRole('admin')
        setIsPasswordPromptVisible(false)
        setErrorCount(0) // 密碼正確時，重置錯誤次數
        setPassword('')
        toast.success('您已成為管理員！')
      } catch (error) {
        toast.error('發生錯誤，請稍後再試。')
      }
    } else {
      setErrorCount(prev => prev + 1)
      toast.error('密碼錯誤，請重試！')
      setPassword('')

      if (errorCount >= 2) {
        toast.error('您已經輸入錯誤密碼超過三次，已自動退出！')
        setPassword('')
        setIsPasswordPromptVisible(false)
        signOutUser()
        await signOut(auth)
        setUser(null)
        setRole(null)
        router.push('/')
        return
      }
    }
  }

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
    <div className={`relative z-0 min-h-screen flex flex-col transition-all duration-500 ${
        theme === 'dark'
          ? "bg-[url('/img/dark-bg.png')]"
          : "bg-[url('/img/home-bg.png')]"
      } bg-cover bg-fixed bg-[position:center_80px]`}
    >
      <Toaster richColors position='bottom-right'/>
      <div className={`absolute inset-0 z-0 ${theme === 'dark' ? 'bg-black/80' : 'bg-white/90'}`} />
      <div ref={ballContainerRef} 
           className="pointer-events-none fixed inset-0 z-10 overflow-hidden" 
      />
      <header className={`sticky top-0 z-50 ${theme === 'dark' ? 'text-white bg-black' : 'text-black bg-white'}`}>
        <h1 className="text-5xl font-serif font-bold text-center">NEBC Learning Platform</h1>
        <p className="text-center text-sm mt-2">
          {currentTime ? (
          <>
            <span>⏰ {currentTime}</span>
            <span className="ml-3">🔥 在線人數 {onlineCount} 人</span>
            <span className="ml-3">🌐 累積訪問 {totalVisitors} 次</span>
            <span className="ml-3">⭐ 網站評價 {averageRating?.toFixed(1) ?? '😆'}</span>
          </>
          ) : ('載入中...')}
        </p>
        <div className="text-center text-md mt-2">
          <Button onClick={handleThemeToggle}>🎨 切換主題</Button>
          <Button onClick={() => setIsPopupVisible(true)}>😎 給予星級</Button>
          {user ? (
            <>
              <Button 
                onClick={signOutUser}
                className='relative py-1 px-3 rounded-md overflow-hidden'
              >
                <span className='z-10'>登出</span>
                <span className="absolute inset-0 border-3 border-transparent rounded-md animate-borderGlow"></span>
              </Button>
              <Link href="/profile" className='mx-2 my-4 rounded-md'>⚙️ 設定</Link>
              <span>👋 歡迎 {user.name} </span>
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
        </div>
      </header>
      <div className={`relative z-0 flex-grow flex flex-col`}>
        <nav className={`sticky top-30 z-50 p-2 shadow flex gap-4 justify-center border-double border-b ${theme === 'dark' ? 'bg-slate-800/50 text-white' : 'bg-zinc-100/50 text-black'}`}>
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
