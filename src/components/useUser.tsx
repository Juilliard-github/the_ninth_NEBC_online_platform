'use client'
import { useState } from 'react'
import { userType } from '@/types/user'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'

export function useUser() {
  const [user, setUser] = useState<userType | null>()
  const unsubscribe = onAuthStateChanged(auth, async(fbUser) => {
    if (fbUser) {
      const userRef = doc(db, 'users', fbUser.uid)
      const userSnap = await getDoc(userRef)
      if (userSnap.exists()) {
        const data = userSnap.data()
        await updateDoc(doc(db, 'users', data.uid), {lastLogin: serverTimestamp()})
        setUser(data as userType)
      }
    }
    return () => unsubscribe()
  })
  return user
}

