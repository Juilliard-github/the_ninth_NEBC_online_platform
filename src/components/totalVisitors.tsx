'use client'
import { doc, onSnapshot } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'

export function TotalVisitors() {
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

  return <>🌐 累積訪問 {totalVisitors} 次</>
}
