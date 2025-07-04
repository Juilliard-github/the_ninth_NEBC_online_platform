'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

export const useAuthRedirect = (requiredRole: 'user' | 'admin') => {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/') // 未登入，回首頁
        return
      }

      const userSnap = await getDoc(doc(db, 'users', user.uid))
      const data = userSnap.data()

      if (!data || data.role !== requiredRole) {
        router.replace('/') // 權限不符
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [requiredRole, router])

  return loading
}