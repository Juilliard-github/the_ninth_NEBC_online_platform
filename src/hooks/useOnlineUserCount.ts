'use client'
import { useEffect, useState } from 'react'
import { rtdb } from '@/lib/firebase'  // 這是你 Firebase RTDB 初始化的實例
import { ref, set, onValue, onDisconnect, remove } from 'firebase/database'
import { v4 as uuidv4 } from 'uuid'

// 定義 `status` 節點的資料結構類型
interface UserStatus {
  online: boolean;
  lastSeen: number;
}

export function useOnlineUserCount() {
  const [onlineCount, setOnlineCount] = useState(0)


useEffect(() => {
  const uid = uuidv4()  // Generates a new unique ID for each session
  const statusRef = ref(rtdb, `status/${uid}`)
  set(statusRef, { online: true, lastSeen: Date.now() })

  onDisconnect(statusRef).remove()

  const statusRootRef = ref(rtdb, 'status')
  const unsub = onValue(statusRootRef, (snapshot) => {
    const data = snapshot.val()
    
    // Filter online users
    const onlineUsers = Object.values(data).filter(
      (user: any) => user.online === true
    )

    setOnlineCount(onlineUsers.length)
  })

  return () => {
    remove(statusRef)
    unsub()
  }
}, [])



  return onlineCount
}

