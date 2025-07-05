'use client'
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore'  // Firestore API
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'


// 用來增加訪問人數的函數
export function useVisitorCount() {
  // 增加訪問人數的函數
  const incrementVisitorCount = async () => {
    const visitorRef = doc(db, 'analytics', 'visitorStats')  // Firestore 中的 visitorStats 文檔

    const docSnap = await getDoc(visitorRef)
    console.log('docsnap:', docSnap)  // 用來檢查是否成功獲取文檔

    if (docSnap.exists()) {
      const data = docSnap.data()
      const currentCount = data?.totalVisitors || 0  // 如果沒有 totalVisitors 字段，設為 0

      console.log('Current totalVisitors:', currentCount)  // 打印出目前的訪問人數

      // 更新訪問者計數
      await updateDoc(visitorRef, {
        totalVisitors: currentCount + 1  // 更新訪問者計數
      })
      console.log('Visitor count updated to:', currentCount + 1)
    } else {
      // 如果文檔不存在，創建一個新的 visitorStats 文檔並初始化 totalVisitors 為 1
      console.log('Creating new visitorStats document')
      await updateDoc(visitorRef, {
        totalVisitors: 1  // 初始化為 1
      })
    }
  }

  // 返回增長人數的函數，讓外部可以觸發
  return { incrementVisitorCount }
}

// 訪問統計的 Hook 用於訂閱 Firestore 的變動
export function useVisitorStats() {
  const [totalVisitors, setTotalVisitors] = useState<number>(0)

  useEffect(() => {
    const visitorRef = doc(db, 'analytics', 'visitorStats')

    // 訂閱 Firestore 文檔的變動
    const unsub = onSnapshot(visitorRef, (docSnap) => {
      const data = docSnap.data()
      if (data?.totalVisitors != null) {
        setTotalVisitors(data.totalVisitors)  // 更新訪問者人數
      } else {
        setTotalVisitors(0)  // 確保 totalVisitors 為 0，如果文檔沒有數據
      }
    })

    return () => unsub()  // 清除監聽器
  }, [])

  return { totalVisitors }  // 返回包含 totalVisitors 的物件
}
