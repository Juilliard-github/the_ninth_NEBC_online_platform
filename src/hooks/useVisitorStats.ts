'use client'

import { useEffect, useRef, useState } from 'react'
import { db } from '@/lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'

export function useVisitorStats() {
  const [totalVisitors, setTotalVisitors] = useState<number>(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const unsubscribeRef = useRef<() => void | null>(null)  // 在這裡定義清除監聽器的 ref

  // 監聽 Firestore 數字 (visitorStats)
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'analytics', 'visitorStats'), (docSnap) => {
      const data = docSnap.data()
      if (data?.totalVisitors != null) {
        setTotalVisitors(data.totalVisitors)
      }
    }, (error) => {
      console.error('Firestore permission error:', error)
      alert('無法加載訪問統計，請檢查權限設定。')
    })
    
    // 保存清除監聽器的函數
    unsubscribeRef.current = unsub

    // 在組件卸載時清除監聽器
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()  // 清除監聽器
      }
    }
  }, []) // 僅在組件掛載和卸載時執行

  // 當關閉頁面且沒有 reload 時才會發送訊息
  useEffect(() => {
    const handleUnload = () => {
      const data = JSON.stringify({}) // 必須有內容才能觸發 JSON Content-Type
      const blob = new Blob([data], { type: 'application/json' })
      const success = navigator.sendBeacon('/api/visitor-increment', blob)
      console.log('sendBeacon success?', success)
    }

    const cancelSend = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('load', cancelSend)

    return () => {
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('load', cancelSend)
    }
  }, [])

  // 返回 totalVisitors 和 unsubscribeRef
  return { totalVisitors, unsubscribeRef }
}
