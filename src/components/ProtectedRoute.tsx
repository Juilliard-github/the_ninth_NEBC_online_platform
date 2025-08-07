'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

const useAuthRedirect = (requiredRole: 'user' | 'admin') => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/')
        return
      }
      const userSnap = await getDoc(doc(db, 'users', user.uid))
      const data = userSnap.data()

      if (!data || data.role !== requiredRole) {
        router.replace('/')
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [requiredRole, router])

  return loading
}

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const loading = useAuthRedirect('admin') // 使用 admin 作為 requiredRole

  if (loading) return <p className="p-5">權限驗證中...</p>
  return <>{children}</>
}