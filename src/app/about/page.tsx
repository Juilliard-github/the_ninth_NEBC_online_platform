'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  collection, query, orderBy, addDoc, serverTimestamp,
  onSnapshot, doc, setDoc, updateDoc, getDoc
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { Button } from '@/components/button'
import { Toaster, toast } from 'sonner'
import remarkBreaks from 'remark-breaks'
import ReactMarkdown from 'react-markdown'
import confetti from 'canvas-confetti'

interface Message {
  id: string
  title: string
  content: string
  createdAt: any
  userName: string
  deleted: boolean
  hidden: boolean
  tags?: string[]
}

interface SimplifiedUser {
  uid: string
  name: string
  email: string
  avatarUrl: string
  nickname: string
  role: string
}


const Colors = [
  'pink',
  'violet',
  'blue',
  'emerald',
  'orange',
  'stone',
  'sky',
  'fuchsia0',
  'slate',
  'amber',
  'lime'
]


const AboutPage = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [newTags, setNewTags] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [editingTitle, setEditingTitle] = useState('')
  const [user, setUser] = useState<SimplifiedUser | null>(null)
  const [role, setRole] = useState<string>('')
  const random = Math.floor(Math.random() * Colors.length)

  const fireConfetti = () => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
    })
  }

  useEffect(() => {
    const q = query(collection(db, 'aboutPosts'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Message))
      setMessages(data)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userDoc = await getDoc(doc(db, 'users', authUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setUser({
            uid: authUser.uid,
            name: authUser.displayName || '',
            email: authUser.email || '',
            avatarUrl: authUser.photoURL || '',
            nickname: userData?.nickname || '',
            role: userData?.role || 'user',
          })
          setRole(userData?.role || 'user')
        }
      } else {
        setUser(null)
        setRole('')
      }
    })
    return () => unsub()
  }, [])

  const handlePost = async () => {
    if (!newMessage.trim()) {
      toast.error('請輸入文字內容')
      return
    }

    const data = {
      title: newTitle,
      content: newMessage,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      userName: user?.nickname || user?.name || '大電神⚡',
      deleted: false,
      hidden: false,
      tags: newTags.split(',').map((tag) => tag.trim()).filter(Boolean)
    }

    await addDoc(collection(db, 'aboutPosts'), data)
    toast.success('內容已送出')
    setNewMessage('')
    setNewTitle('')
    setNewTags('')
  }

  const handleDelete = async (id: string) => {
    toast.error('確定要刪除這則內容嗎？', {
      description: '此操作無法還原',
      action: {
        label: '確認',
        onClick: () => {
          setDoc(doc(db, 'aboutPosts', id), { deleted: true }, { merge: true })
          toast.success('已刪除內容')
        },
      },
    })
  }

  const handleHide = async (id: string) => {
    if (role !== 'admin') return
    toast.info('確定要隱藏這則內容嗎？', {
      action: {
        label: '確認',
        onClick: () => {
          setDoc(doc(db, 'aboutPosts', id), { hidden: true }, { merge: true })
          toast.success('已隱藏內容')
        },
      },
    })
  }

  const handleRecover = async (id: string) => {
    if (role !== 'admin') return
    setDoc(doc(db, 'aboutPosts', id), { hidden: false }, { merge: true })
    toast.success('已復原內容')
  }

  const handleEdit = async (id: string) => {
    if (!editingContent.trim()) {
      toast.error('請輸入內容')
      return
    }
    await updateDoc(doc(db, 'aboutPosts', id), {
      content: editingContent,
      title: editingTitle,
      updatedAt: serverTimestamp()
    })
    setEditingId(null)
    toast.success('內容已更新')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Toaster richColors position="bottom-right" />

      {/* 封面區塊 */}
      <div className="mb-10 p-6 rounded-xl bg-gradient-to-br from-indigo-100 to-pink-100">
        <h1 className="text-2xl font-extrabold text-purple-800">網站創作手記
          <Button onClick={fireConfetti} className="text-lg">
            🎉 
          </Button>
        </h1>
        <span className="mt-2 text-zinc-600">
          <div>
          這裡記錄了我製作本網站的點滴心得與札記。專案緣起、設計思路、過程挑戰與小小成就。
          </div>
          <div>
          若有任何問題或建議，歡迎寄信給我{' '}
          <Link href="mailto:juilliard.wynn@gmail.com" className="text-blue-500 underline text-md">✉ 聯絡我</Link>
          </div>
        </span>
      </div>

      {role === 'admin' && (
        <div className="space-y-2 mb-10">
          <p>標題</p>
          <textarea
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="輸入標題（最多 50 字）"
            className="w-full border rounded p-2 bg-zinc-200/10"
            rows={1}
            maxLength={50}
          />
          <p>內容</p>
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="輸入內容（支援 Markdown）"
            className="w-full border rounded p-2 bg-zinc-200/10"
            rows={6}
          />
          <p>#標籤</p>
          <input
            value={newTags}
            onChange={(e) => setNewTags(e.target.value)}
            placeholder="輸入分類（用逗號分隔）"
            className="w-full border rounded p-2 bg-zinc-200/10"
          />
          <Button variant="create" onClick={handlePost}>發布內容</Button>
        </div>
      )}

      <ul className="space-y-6" >
        {messages.map((msg) => {
          if (!user) return null
          return (
            <li key={msg.id}>
              {editingId === msg.id && role === 'admin' ? (
                <div>
                  <textarea
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    className="w-full border rounded p-1 mb-1"
                    rows={1}
                  />
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full border rounded p-1"
                    rows={4}
                  />
                  <div className="flex gap-2 mt-2">
                    <Button variant="edit" onClick={() => handleEdit(msg.id)}>儲存</Button>
                    <Button variant="undo" onClick={() => setEditingId(null)}>取消</Button>
                  </div>
                </div>
              ) : (
                <>
                  {!msg.hidden || role === 'admin' && (
                    <div className="rounded-xl bg-zinc-200/10 border p-4 shadow-sm">
                      <h1 className={`text-4xl font-bold font-[ChenYuluoyan] text-${Colors[random]}-500 drop-shadow-md`}
                          style={{ textShadow: '1px 1px 1px rgba(0, 0, 0, 0.15)' }}
                      >
                      {msg.title}
                      </h1>
                      {msg.tags && msg.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1 text-xs">
                          {msg.tags.map(tag => (
                            <span key={tag} className="font-[ChenYuluoyan] text-2xl bg-amber-500/70 px-2 py-0.5 rounded-full">#{tag}</span>
                          ))}
                        </div>
                      )}
                      <div className={`font-[ChenYuluoyan] text-2xl prose dark:prose-invert max-w-none mt-3 decoration-dotted underline-offset-4 underline decoration-${Colors[random]}-500`}>
                        <ReactMarkdown remarkPlugins={[remarkBreaks]}>
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                      <div className="text-xs text-right text-gray-400 mt-2">
                        by {msg.userName} ・{msg.createdAt?.toDate()?.toLocaleString?.()}
                      </div>
                    </div>
                  )}
                </>                  
              )}


              {role === 'admin' && editingId !== msg.id && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="edit" onClick={() => {
                    setEditingId(msg.id)
                    setEditingTitle(msg.title)
                    setEditingContent(msg.content)
                  }}>編輯</Button>
                  <Button size="sm" variant="delete" onClick={() => handleDelete(msg.id)}>刪除</Button>
                  <Button size="sm" variant={msg.hidden ? 'undo' : 'default'} onClick={() => msg.hidden ? handleRecover(msg.id) : handleHide(msg.id)}>
                    {msg.hidden ? '復原' : '隱藏'}
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default AboutPage