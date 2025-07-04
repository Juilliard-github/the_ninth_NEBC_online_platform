// components/ImageUploader.tsx
'use client'

import { useState } from 'react'
import { storage } from '@/lib/firebase'
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage'

type Props = {
  onUploadComplete: (url: string) => void
}

export default function ImageUploader({ onUploadComplete }: Props) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const storageRef = ref(storage, `question-images/${Date.now()}_${file.name}`)
    const uploadTask = uploadBytesResumable(storageRef, file)

    setUploading(true)

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        setProgress(pct)
      },
      (error) => {
        console.error('上傳錯誤', error)
        setUploading(false)
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
        onUploadComplete(downloadURL)
        setUploading(false)
      }
    )
  }

  return (
    <div>
      <input type="file" accept="image/*" onChange={handleFileChange} />
      {uploading && <p>上傳中... {Math.round(progress)}%</p>}
    </div>
  )
}