import { signInWithPopup, GoogleAuthProvider} from 'firebase/auth'
import { toast } from 'sonner'
import { auth, db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { incrementVisitorCount } from '@/components/incrementVisitor'
export const SignInUser = async () => {
  incrementVisitorCount()
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({prompt: 'select_account'})
  const result = await signInWithPopup(auth, provider)
  if (!result.user) {
    toast.success('發生錯誤，請重試。')
  } else {
    const userRef = doc(db, 'users', result.user.uid)
    const userSnap = await getDoc(userRef)
    if (userSnap.exists()) {
        const data = userSnap.data()
        // console.log(data)
        if (data.deleted === true) {
          toast.info('您的帳號已遭刪除，請聯絡管理員。')
        } else {
          if (data.role === 'user') {
            toast.success('成功登入')
          }
          if (data.role === 'pending') {
            toast.info('您的帳號正在等待管理員審核')
          }          
        }
    } else{
      toast.success('尚未註冊')
    }
  }
}