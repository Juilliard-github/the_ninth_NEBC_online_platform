import { useState } from 'react'
import { Button } from '@/components/button'
import { sha256 } from 'js-sha256'
import { useUser } from './useUser'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function SignUp() {
  const user = useUser()
  const userId = user?.uid;
  const [ role, setRole ] = useState('pending')
  const [isAdminPromptVisible, setIsAdminPromptVisible] = useState(false)
  const [password, setPassword] = useState('')
  const [errorCount, setErrorCount] = useState<number>(0) 
  const [isPasswordPromptVisible, setIsPasswordPromptVisible] = useState(false)
  const router = useRouter()

  const SignUpWithRole = () => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userRef = doc(db, 'users', fbUser.uid)
        const userSnap = await getDoc(userRef)
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: fbUser.uid,
            name: fbUser.displayName || '匿名',
            nickname: '',
            email: fbUser.email || '',
            avatarUrl: '/img/profile-icon-design-free-vector',
            role,
            totalScore: 0,
            correctCount: 0,
            totalQuestions: 0,
            correctRate: 0,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp(),
            lastRatedAt: serverTimestamp(),
            deleted: false
          })
        }
      }
    })
    return () => unsubscribe()
  }



  const handleAdminSelection = () => {
    setIsAdminPromptVisible(false)
    setIsPasswordPromptVisible(true)
  }

  const handleNotAdminSelection = () => {
    SignUpWithRole()
    setIsAdminPromptVisible(false)
    setIsPasswordPromptVisible(false)
    toast.success('註冊成功！')
  }

  const handlePasswordSubmit = async () => {
    const adminPassword = 'fb5f56346d9c89316d0d2a30398c00233f7a6cfbd1ac80d641cf14fc4f1df0ec'
    if (sha256(password) === adminPassword) {
      if (!userId) {
        toast.error('用戶資料無效，請重新登錄！')
        return
      }
      try {
        setIsPasswordPromptVisible(false)
        setErrorCount(0) // 密碼正確時，重置錯誤次數
        setPassword('')
        setRole('admin')
        SignUpWithRole()
        toast.success('註冊成功！您已成為管理員！')
      } catch (error) {
        toast.error('發生錯誤，請稍後再試。')
      }
    } else {
      if (errorCount < 2) {
        setErrorCount(prev => prev + 1)
        toast.error('密碼錯誤，請重試！')
        setPassword('')
      } else {
        toast.error('已經輸入錯誤密碼超過三次！如有問題請聯絡管理員。')
        setPassword('')
        setIsPasswordPromptVisible(false)
        SignUpWithRole()
      }
    }
  }
  return (
    <>
      <Toaster position='bottom-right' richColors/>
      {isAdminPromptVisible && (
        <div className="shadow item-center text-center">
          <p>請選擇是否為管理員</p>
          <div className='p-2 flex flex-grow justify-center gap-2'>
            <Button variant="undo" onClick={handleAdminSelection} className="admin-btn">是</Button>
            <Button variant="view" onClick={handleNotAdminSelection} className="admin-btn">否</Button>
          </div>
        </div>
      )}
      {isPasswordPromptVisible && (
        <div className="shadow text-center item-center">
          <p>請輸入密碼：</p>
          <div className='p-2 flex flex-grow justify-center gap-2'>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="管理員密碼"
            className="px-2 item-center"
          />
          <Button variant="submit" onClick={handlePasswordSubmit}>提交</Button>
        </div>
        </div>
      )}
    </>
  )
}