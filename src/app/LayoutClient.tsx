'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { Button } from '@/components/button'
import Link from 'next/link'
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth' // Firebase User type
import { userType } from '@/types/user' // Your custom user type
import { toast, Toaster } from 'sonner'
import RatingPopup from '@/components/RatingPopup'
import { useOnlineUserCount } from '@/hooks/useOnlineUserCount'
import { useVisitorStats } from '@/hooks/useVisitorStats'
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth'

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null) // Firebase user state
  const [user, setUser] = useState<userType | null>(null) // Custom userType state
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const ballContainerRef = useRef<HTMLDivElement>(null)
  const [averageRating, setAverageRating] = useState<number | null>(null)
  const [isPopupVisible, setIsPopupVisible] = useState(false)
  const [initial, setInitial] = useState(false)
  const onlineCount = useOnlineUserCount()
  const totalVisitors = useVisitorStats().totalVisitors
  const { unsubscribeRef } = useVisitorStats()

  // Google sign in
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    return result.user
  }


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
  // Fetch user data (role & ratings)
  useEffect(() => {
    calculateAverageRating()
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setFbUser(firebaseUser)

        // Fetch user role or assign default
        const userRef = doc(db, 'users', firebaseUser.uid)
        const userDoc = await getDoc(userRef)

        if (!userDoc.exists()) {
          setInitial(true)
          // If the user is not found, set default user fields
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || '',
            nickname: '',
            email: firebaseUser.email || '',
            role: 'pending',
            totalScore: 0,
            correctCount: 0, 
            totalQuestions: 0,
            correctRate: 0,
            createdAt: new Date(),
            lastRatedAt: new Date(),
          })
        }

        // Get role from Firestore or set it as pending
        const userData = userDoc.data() || {}
        const userRole = userData.role || 'pending'

        setRole(userRole)
        
        // Map Firebase user to custom userType
        const mappedUser: userType = {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || '',
          nickname: userData.nickname || '',
          role: userRole,
          email: firebaseUser.email || '',
          avatarUrl: firebaseUser.photoURL || '',
          totalScore: userData.totalScore || 0,
          correctRate: userData.correctRate || 0,
          totalQuestions: userData.totalQuestions || 0,
          updatedAt: userData.updatedAt || new Date(),
          createdAt: userData.createdAt || new Date(),
          lastRatedAt: userData.lastRatedAt || new Date(),
          theme: userData.theme || 'light',
          correctCount: userData.correctCount || 0,
        }

        setUser(mappedUser)

        // Redirect based on user role
        if(initial || role === 'pending'){
          if (userRole === 'admin') {
            router.push(userData.nickname ? '/admin/dashboard' : '/profile')
          } else if (userRole === 'user') {
            router.push(userData.nickname ? '/user/practice-list' : '/profile')
          } else {
            toast('⏳ 帳號尚未通過審核，請稍候...')
          }
        }


        // Set up snapshot listener for role updates
        const unsubscribeRole = onSnapshot(userRef, (snap) => {
          const updatedRole = snap.data()?.role || 'pending'
          setRole(updatedRole)
          setLoading(false)
        })
        
        return () => unsubscribeRole()
      } else {
        setUser(null)
        setRole(null)
        setLoading(false)  
      }
    })

    return () => {
      unsubscribeAuth()  // Cleanup auth listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current()  // Cleanup visitor stats listener if exists
      }
    }
  }, [router, unsubscribeRef])

  // Calculate average rating
  const calculateAverageRating = async () => {
    try {
      const ratingsRef = doc(db, 'analytics', 'ratings') 
      const ratingsDoc = await getDoc(ratingsRef)
      if (!ratingsDoc.exists()) {
        console.error('Rating document not found')
        return 0
      }

      const { total, count } = ratingsDoc.data()
      const averageRating = count === 0 ? 0 : total / count
      setAverageRating(averageRating)
    } catch (err) {
      console.error('無法取得評價', err)
      return 0
    }
  }

  // Handle rating popup
  const showPopup = () => setIsPopupVisible(true)
  const handleRatingSubmit = () => {
    setTimeout(() => {
      calculateAverageRating()
    }, 1000)
    setIsPopupVisible(false)
    router.push('/')
  }

  // Time management (current time)
  useEffect(() => {
    setCurrentTime(new Date())
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Theme toggle
  const toggleTheme = async () => {
    const newMode = !darkMode
    setDarkMode(newMode)
    if (user) {
      await setDoc(doc(db, 'users', user.uid), {
        theme: newMode ? 'dark' : 'light',
      }, { merge: true })
    }
  }

  // Sign out
  const signOutUser = async () => {
    try {
      await signOut(auth)
      console.log("User signed out successfully")
      setUser(null)
      setRole(null)
      setLoading(false)
      router.push('/')
    } catch (error) {
      console.error("Error signing out: ", error)
    }
  }

  return (
    <div
      className={`relative min-h-screen flex flex-col transition-all duration-500 ${
        darkMode
          ? "bg-[url('/img/dark-bg.png')] text-white bg-black"
          : "bg-[url('/img/home-bg.png')] bg-white"
      } bg-cover bg-fixed bg-[position:center_100px]`}
    >
      <Toaster richColors position='bottom-right'/>
      <div className={`absolute inset-0 z-0 ${darkMode ? 'bg-black/80' : 'bg-white/60'}`} />
      <div ref={ballContainerRef} 
           className="pointer-events-none fixed inset-0 z-10 overflow-hidden" 
      />

      <header className={`sticky top-0 z-50 border-b pb-4 ${darkMode ? 'bg-black' : 'bg-white'}`}>
        <h1 className="text-5xl font-serif font-bold text-center">NEBC Learning Platform</h1>
        <p className="text-center text-sm mt-2">
          {currentTime
            ? `${currentTime.toLocaleString()} 🐣 在線人數：${onlineCount} 🐣 累積訪問：${totalVisitors} 🐣 評價: ${averageRating !== null ? averageRating.toFixed(1) : '😆'}顆星`
            : '載入中...'} 
        </p>
        <div className="text-center mt-2">
          <Button onClick={toggleTheme}>
            切換主題：{darkMode ? '🌞 淺色' : '🌙 深色'}
          </Button>
          <Button onClick={showPopup}>😎給評價</Button>
          {loading ? (
            <p>登入中...</p>
          ) : user ? (
            <div className="inline-flex items-center justify-center gap-4 ml-2 mt-2">
              <Button onClick={signOutUser}>登出</Button>
              <p>👋 歡迎 {user.name}</p>
              <Link href="/profile">⚙️ 設定</Link>
            </div>
          ) : (
            <Button onClick={signInWithGoogle}>登入</Button>
          )}
          <div>
          </div>
        </div>
      </header>

      <div className="relative z-0 flex-grow flex flex-col">
        <nav className={`sticky top-36 z-50 p-2 shadow flex gap-4 justify-center ${darkMode ? 'bg-black' : 'bg-white'}`}>
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
        
        {isPopupVisible && <RatingPopup onRatingSubmit={handleRatingSubmit} />}

        <main className="flex-grow relative p-6">
          <div className={`${darkMode ? '' : 'bg-white/50'} p-0 rounded-none shadow-none`}>
            {children}
          </div>
        </main>

        <footer className={`text-center text-sm pt-2 border-t pb-2 ${darkMode ? 'bg-transparent' : 'bg-white/50'}`}>
          Ⓒ 2025 NEBC Learning Platform Ⓒ 2025 Juilliard Wynn. All rights reserved.
          <Link href="/about" className={`${darkMode ? 'text-zinc-400' : 'text-blue-800'}`}> ℹ️關於</Link>
        </footer>
      </div>
    </div>
  )
}
