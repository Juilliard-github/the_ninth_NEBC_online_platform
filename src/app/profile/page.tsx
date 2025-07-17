'use client'

import { useEffect, useState } from 'react'
import { auth, db, storage } from '@/lib/firebase'
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from 'firebase/storage'
import { onAuthStateChanged } from 'firebase/auth'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Button } from '@/components/button'
import { Avatar, AvatarImage } from '@/components/avatar'
import { toast, Toaster } from 'sonner'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
  const router = useRouter()
  const [uid, setUid] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [nickname, setNickname] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [lastRatedAt, setLastRatedAt] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploadProgress, setUploadProgress] = useState(0) // 新增進度狀態

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUid(user.uid)
        setEmail(user.email || '')
        const docRef = doc(db, 'users', user.uid)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          if(data.role === '' || data.deleted){
            toast.info('您的帳號已遭刪除，請聯絡管理員。')
            return
          }
          setNickname(data.nickname || '')
          setBio(data.bio || '')
          setAvatarUrl(data.avatarUrl || '')
          setName(data.name)
          setCreatedAt(data.createdAt?.toDate().toLocaleString() || '')
          setLastRatedAt(data.lastRatedAt?.toDate().toLocaleString() || '')
        }
        setLoading(false)
      }
    })
    return () => unsub()
  }, [])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    try {
      let uploadedAvatarUrl = avatarUrl

      if (avatarFile) {
        const storageRef = ref(storage, `avatars/${uid}`)
        const uploadTask = uploadBytesResumable(storageRef, avatarFile)

        // 監聽上傳進度
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress =
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            setUploadProgress(progress) // 更新進度條
          },
          (error) => {
            toast.error('上傳頭像失敗')
            console.error(error)
          },
          async () => {
            uploadedAvatarUrl = await getDownloadURL(uploadTask.snapshot.ref)
            setUploadProgress(0) // 上傳完成後重置進度
          }
        )
      }

      const payload = {
        nickname,
        bio,
        avatarUrl: uploadedAvatarUrl,
        createdAt: Timestamp.fromDate(new Date(createdAt)),
        lastRatedAt: Timestamp.fromDate(new Date(lastRatedAt)),
        updatedAt: serverTimestamp(),
      }
      await setDoc(doc(db, 'users', uid), payload, { merge: true })
      toast.success('個人資料已儲存！')
      setTimeout(() => {router.push('/user/practice-list')},1000)
    } catch (err) {
      console.error(err)
      toast.error('儲存失敗')
    }
  }

  if (loading) return <div className="p-4 text-gray-400 text-center">載入中...</div>

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Toaster richColors position='bottom-right'/>
      <h1 className="text-2xl font-bold">個人資料設定</h1>

      <div className="flex items-center gap-4">
        <Avatar className="w-20 h-20 rounded-full">
          <AvatarImage src={avatarUrl || 'img/profile-icon-design-free-vector.jpg'} />
          {/*<AvatarFallback>{nickname ? nickname.slice(0, 2) : name ? name.slice(0, 2) : '👤'}</AvatarFallback>*/}
        </Avatar>
        <Input className="bg-zinc-200/20" type="file" accept="image/*" onChange={handleAvatarChange} />
      </div>

      <div className="space-y-2">
        <label className="block font-medium">電子郵件(唯讀)</label>
        <Input value={email} readOnly />
      </div>

      <div className="space-y-2">
        <label className="block font-medium">註冊時間(唯讀)</label>
        <Input value={createdAt} readOnly />
      </div>

      <div className="space-y-2">
        <label className="block font-medium">名稱</label>
        <Input value={name} readOnly/>
      </div>

      <div className="space-y-2">
        <label className="block font-medium">暱稱</label>
        <Input className="bg-zinc-200/20" value={nickname} onChange={(e) => setNickname(e.target.value)} />
      </div>

      <div className="space-y-2">
        <label className="block font-medium">自我介紹</label>
        <Textarea className="bg-zinc-200/20" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={300} />
      </div>

      {/* 顯示上傳進度條 */}
      {uploadProgress > 0 && (
        <div className="my-2">
          <div>上傳進度：{Math.round(uploadProgress)}%</div>
          <div className="h-2 bg-gray-500 rounded-full">
            <div
              className="h-full bg-stone-700/80 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      <Button variant="submit" onClick={handleSave}>💾 儲存變更</Button>
    </div>
  )
}
