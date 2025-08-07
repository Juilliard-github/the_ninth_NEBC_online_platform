'use client'
import { useEffect, useState } from 'react'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'  

export function AverageRating() {
  const [averageRating, setAverageRating] = useState<number>(0)

  const fetchRating = async () => {
    const snap = await getDoc(doc(db, 'analytics', 'ratings'))
    const data = snap.data()
    if (data) {
      const avg = data.count === 0 ? 0 : data.total / data.count
      setAverageRating(avg)
    }
  }
  fetchRating()

  return <>⭐ 網站評價 {averageRating?.toFixed(1) ?? '😆'}</>
}