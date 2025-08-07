'use client'
import CommentIcon from '@mui/icons-material/Comment';
import { useEffect, useState } from 'react'
import {
  collection,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
  onSnapshot,
  setDoc,
  updateDoc,
  getDoc,
  doc,
} from 'firebase/firestore'
import { Button } from '@/components/button'
import { toast } from 'sonner'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'

interface Message {
  id: string
  content: string
  createdAt: any
  uid?: string
  userName?: string
  userPhotoURL: string
  anonymous?: boolean
  deleted: boolean
  hidden: boolean
  updatedAt?: any
}
interface SimplifiedUser {
  uid: string;
  name: string;
  email: string;
  avatarUrl: string;
  nickname: string;
  role: string; // You can decide to include this if it's needed for your component
}


export default function GuestbookPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [lastPostedAt, setLastPostedAt] = useState<number>(0)
  const [user, setUser] = useState<SimplifiedUser | null>(null)
  const [role, setRole] = useState<string>('')

  useEffect(() => {
    const q = query(collection(db, 'guestbook'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Message))
      setMessages(data)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        // User is logged in, fetch their role from Firestore
        const userDoc = await getDoc(doc(db, 'users', authUser.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
        setUser({
          uid: authUser.uid,
          name: authUser.displayName || '',
          email: authUser.email || '',
          avatarUrl: authUser.photoURL || 'img/profile-icon-design-free-vector.jpg',
          nickname: userData?.nickname || '',
          role: userData?.role || 'user'
        })
        setRole(userData?.role || 'user')
        }
      } else {
        // No user is logged in
        setUser(null)
        setRole('')
      }
    })
    return () => unsub()
  }, [])

  const handlePost = async () => {
    if (!newMessage.trim()) {
      toast.error('請輸入留言內容')
      return
    }
    if (newMessage.length > 500) {
      toast.error('留言內容請勿超過 500 字')
      return
    }
    const now = Date.now()
    if (now - lastPostedAt < 30000) {
      toast.error('請稍候再留言')
      return
    }

    const data = {
      content: newMessage,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      uid: user?.uid,
      userName: isAnonymous ? '匿名' : user?.nickname || user?.name || '訪客',
      userPhotoURL: isAnonymous ? 'img/profile-icon-design-free-vector.jpg' : user?.avatarUrl,
      anonymous: isAnonymous,
      deleted: false,
      hidden: false,
    }

    await addDoc(collection(db, 'guestbook'), data)
    toast.success('留言已送出')
    setNewMessage('')
    setLastPostedAt(now)
  }

  const handleDelete = async (id: string) => {
    toast.error('確定要刪除這則留言嗎？', {
      description: '此操作無法還原',
      action: {
        label: '確認',
        onClick: () => {
          setDoc(doc(db, 'guestbook', id), { deleted: true }, { merge: true })
          toast.success('已刪除留言')
        },
      },
    })
  }

  const handleHide = async (id: string) => {
    if (role !== 'admin') return // Ensure only admins can hide
    toast.info('確定要隱藏這則留言嗎？', {
      action: {
        label: '確認',
        onClick: () => {
          setDoc(doc(db, 'guestbook', id), { hidden: true }, { merge: true })
          toast.success('已隱藏留言')
        },
      },
    })
  }

  const handleRecover = async (id: string) => {
    if (role !== 'admin') return // Ensure only admins can hide
    setDoc(doc(db, 'guestbook', id), { hidden: false }, { merge: true })
    toast.success('已復原留言')
  }

  const handleEdit = async (id: string) => {
    if (!editingContent.trim()) {
      toast.error('請輸入內容')
      return
    }
    await updateDoc(doc(db, 'guestbook', id), {
      content: editingContent,
      updatedAt: serverTimestamp()
    })
    setEditingId(null)
    toast.success('留言已更新')
  }

  return (
    <main>
      <h1><CommentIcon/> 留言板</h1>
      {user ? (
        <div className="space-y-2">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="想說點什麼呢...（最多 500 字）"
            className="w-full border rounded p-2 bg-zinc-200/20"
            rows={4}
            maxLength={500}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              匿名留言
            </label>
            <Button variant="create" onClick={handlePost}>送出留言</Button>
          </div>
        </div>
      ) : (
        <p>請先登入才能留言。</p>
      )}

      <ul className="space-y-4">
        {messages.map((msg) => (
          <li key={msg.id}>
            {!msg.hidden && (
            <div className="comments flex items-start gap-2 bg-zinc-200/20 p-3 shadow">
              {msg.userPhotoURL ? (
                <img
                  src={msg.userPhotoURL}
                  alt="avatar"
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              ) : (
                <div className="w-9 h-9 bg-gray-300 rounded-full flex items-center justify-center text-white">
                  {msg.userName?.charAt(0) || '?'}
                </div>
              )}
              <div className="flex-1">
                <div className="font-semibold">{msg.userName}</div>

                {/* Conditional rendering for deleted or hidden messages */}
                {msg.deleted ? (
                  <div className="flex gap-2 mt-2 text-gray-400/90">(使用者已刪除此留言)</div>
                ) : (
                  <>
                    {editingId === msg.id ? (
                      <div>
                        <textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="w-full border rounded p-1 mt-1"
                          rows={3}
                        />
                        <div className="flex gap-2 mt-1">
                          <Button variant="edit" onClick={() => handleEdit(msg.id)}>儲存</Button>
                          <Button variant="undo" onClick={() => setEditingId(null)}>取消</Button>
                        </div>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words break-all hyphens-auto">{msg.content}</p>
                    )}
                  </>
                )}

                <div className="text-xs text-gray-400 mt-1">
                  {msg.updatedAt?.toDate?.().toLocaleString?.()}
                </div>

                {/* Admin and User Specific Actions */}
                {!msg.deleted && editingId !== msg.id && (
                  <div className="flex gap-2 mt-2">
                    {/* Edit Button */}
                    {role === 'admin'|| user?.uid === msg.uid ? (
                      <Button
                        variant="edit"
                        onClick={() => {
                        setEditingId(msg.id)
                        setEditingContent(msg.content)
                      }}>
                        編輯
                      </Button>
                    ) : null}
                    
                    {/* Delete Button */}
                    {role === 'admin' || user?.uid === msg.uid ? (
                      <Button
                        variant="delete"
                        onClick={() => handleDelete(msg.id)}>
                        刪除
                      </Button>
                    ) : null}

                    {/* Hide Button (Admin Only) */}
                    {role === 'admin' && (
                      <Button
                        variant={`${msg.hidden ? 'undo' : 'default'}`}
                        onClick={() => msg.hidden ? handleRecover(msg.id) : handleHide(msg.id)}>
                        {msg.hidden ? '復原' : '隱藏'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  )
}