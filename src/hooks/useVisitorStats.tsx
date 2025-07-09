'use client'
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore'  // Firestore API
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'

export function useVisitorCount() {
  const incrementVisitorCount = async () => {
    const visitorRef = doc(db, 'analytics', 'visitorStats')
    const docSnap = await getDoc(visitorRef)

    if (docSnap.exists()) {
      const data = docSnap.data()
      const currentCount = data?.totalVisitors || 0  
      await updateDoc(visitorRef, {
        totalVisitors: currentCount + 1 
      })
    } else {
      await updateDoc(visitorRef, {
        totalVisitors: 1
      })
    }
  }
  return { incrementVisitorCount }
}

export function useVisitorStats() {
  const [totalVisitors, setTotalVisitors] = useState<number>(0)

  useEffect(() => {
    const visitorRef = doc(db, 'analytics', 'visitorStats')
    const unsub = onSnapshot(visitorRef, (docSnap) => {
      const data = docSnap.data()
      if (data?.totalVisitors != null) {
        setTotalVisitors(data.totalVisitors)  
      } else {
        setTotalVisitors(0) 
      }
    })
    return () => unsub()  
  }, [])

  return { totalVisitors }
}
