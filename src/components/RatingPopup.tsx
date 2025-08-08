'use client'
import { useState } from 'react'
import { db } from '@/lib/firebase'
import { setDoc, doc, getDoc, collection, serverTimestamp } from 'firebase/firestore'
import { toast } from 'sonner'
import { Button } from '@/components/button'
import { useUser } from '@/components//useUser'
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';

export const RatingPopup = () => {
  const [isPopupVisible, setIsPopupVisible] = useState(false)
  const user = useUser()
  const [rating, setRating] = useState<number | null>(null)

  const giveRating = () => {
    if (user) {
      setRating(0)
      setIsPopupVisible(true)
    } else {
      toast.error('請先登入')
    }
  }
  // 儲存用戶評價到 Firestore
  const saveUserRating = async (rating: number) => {
    if(!user){
      toast.error('請先登入')
      return
    }
    try {
      const ratingsRef = collection(db, 'userRatings', user.uid, 'ratings')
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
      await setDoc(doc(db, 'users', user.uid), {
        lastRatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })
      await setDoc(totalRatingsRef, {
        count: count + 1,
        total: total + rating,
      })
      setIsPopupVisible(false);
    } catch (err) {
      console.error('儲存評價失敗', err)
      toast.error('儲存評價失敗')
    } finally {
      toast.success('感謝您的評價！')
    }
  }

  return (
    <>
      <Button onClick={giveRating}><ThumbUpIcon/> 給予星級</Button>
      {(isPopupVisible || (user && new Date(user.lastRatedAt)<new Date())) && (
        <div className="top-40 fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
          <div className="bg-white p-5 rounded-lg shadow-lg max-w-sm w-full">
            <div className='flex flex-grow justify-between text-black mb-4'>
              <h1>請給我們評價</h1>
              <Button className='shadow-none pr-2 text-xl' onClick={() => setIsPopupVisible(false)}>x</Button>
            </div>

            <div className="flex justify-center mb-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <Button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`shadow-none text-3xl ${rating || 0 >= star ? 'text-yellow-500' : 'text-gray-300'}`}
                >
                  {`${rating || 0 >= star ? <StarIcon/> : <StarBorderIcon/>}`}
                </Button>
              ))}
            </div>
            <div className="flex justify-center mt-4">
              <Button
                onClick={() => saveUserRating(rating!)}
                variant='submit'
                disabled={rating === null}
              >
              提交評價
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}