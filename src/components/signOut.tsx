'use client'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { toast } from 'sonner'

export const signOutUser = async () => {
  await signOut(auth)
  window.location.reload()
  toast.success('已成功登出')
}