'use client';
import { useEffect, useState } from 'react'
import { rtdb } from '@/lib/firebase'
import { ref, set, onValue, onDisconnect } from 'firebase/database'
import { v4 as uuidv4 } from 'uuid'

interface UserStatus {
  online: boolean;
  lastSeen: number;
}

export const OnlineUserCount = () => {
  const [onlineCount, setOnlineCount] = useState(0)

  useEffect(() => {
    const uid = uuidv4()
    const statusRef = ref(rtdb, `status/${uid}`)
    
    set(statusRef, { online: true, lastSeen: Date.now() })
    onDisconnect(statusRef).remove()

    const statusRootRef = ref(rtdb, 'status')

    const unsub = onValue(statusRootRef, (snapshot) => {
      const data = snapshot.val()
      const onlineUsers = Object.values(data).filter(
        (user: any) => user.online === true
      )

      setOnlineCount(onlineUsers.length)
    })
    return () => unsub()  
  },[])

  return <>🔥 在線人數 {onlineCount} 人</>
}