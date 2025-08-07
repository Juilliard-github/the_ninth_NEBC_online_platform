'use client'

import { useEffect, useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/')
        return
      }

      const snap = await getDoc(doc(db, 'users', user.uid))
      const role = snap.data()?.role
      if (role !== 'admin') {
        router.replace('/')
        return
      }

      setLoading(false)
    })

    return () => unsub()
  }, [router])

  if (loading) return <div>驗證中...</div>
  return <div className="p-5 text-center">歡迎管理員！</div>
}