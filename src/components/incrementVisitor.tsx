import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export const incrementVisitorCount = async () => {
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