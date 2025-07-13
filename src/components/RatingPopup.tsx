import { useState } from 'react'
import { auth, db } from '@/lib/firebase'
import { setDoc, doc, getDoc, collection, serverTimestamp } from 'firebase/firestore'
import { toast, Toaster } from 'sonner'
import { Button } from '@/components/button'

const RatingPopup = ({ onRatingSubmit }: { onRatingSubmit: () => void }) => {
  const [rating, setRating] = useState<number | null>(null)

  // 儲存用戶評價到 Firestore
  const saveUserRating = async (rating: number) => {
    const userId = auth.currentUser?.uid

    if (!userId) {
      toast.error('請先登入')
      setTimeout(() => {
        // After showing the toast, force a page reload
        window.location.reload()
      }, 1000)
      return
    }

    try {
      // 儲存評價到 userRatings 集合
      const ratingsRef = collection(db, 'userRatings', userId, 'ratings')
      const totalRatingsRef = doc(db, 'analytics', 'ratings')
      const totalRatingsDoc = await getDoc(totalRatingsRef)
      if (!totalRatingsDoc.exists()) {
        console.error('Rating document not found')
        return 0
      }
      const { total, count } = totalRatingsDoc.data()
      await setDoc(doc(ratingsRef), {
        rating,
        timestamp: serverTimestamp(),
      })
      await setDoc(doc(db, 'users', userId), {
        lastRatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })
      await setDoc(totalRatingsRef, {
        count: count + 1,
        total: total + rating,
      })
      toast.success('感謝您的評價！')
      onRatingSubmit()  // 提交評分後調用這個回調來更新平均評分
    } catch (err) {
      console.error('儲存評價失敗', err)
      toast.error('儲存評價失敗')
    }
  }

  return (
    <div className="top-40 fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <Toaster richColors position="bottom-right" />
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
        <h2 className="text-xl font-bold mb-4 text-black">請給我們評價</h2>
        <div className="flex justify-center mb-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <Button
              key={star}
              onClick={() => setRating(star)}
              className={`shadow-none text-3xl ${rating >= star ? 'text-yellow-500' : 'text-gray-300'}`}
            >
              ★
            </Button>
          ))}
        </div>
        <div className="flex justify-center mt-4">
          <Button
            onClick={() => saveUserRating(rating!)}
            className="bg-blue-500 text-white py-2 px-4 rounded"
            disabled={rating === null}
          >
          提交評價
          </Button>
        </div>
      </div>
    </div>
  )
}

export default RatingPopup
