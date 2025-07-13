'use client'

import { Button } from '@/components/button'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { toast, Toaster } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  role: string
  theme?: string
  deleted?: boolean
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [theme, setTheme] = useState<string>('') 
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/')
        return
      }

      try {
        const userDoc = await getDocs(collection(db, 'users'))
        const currentUserDoc = userDoc.docs.find(doc => doc.id === currentUser.uid)

        if (!currentUserDoc || currentUserDoc.data().role !== 'admin') {
          toast.error('你沒有權限進入此頁面')
          router.push('/')
          return
        }

        const userData: User = {
          id: currentUser.uid,
          name: currentUser.displayName || '未設定',
          email: currentUser.email || '未提供',
          role: currentUserDoc.data().role || 'N/A',
          theme: currentUserDoc.data().theme,
          deleted: currentUserDoc.data().deleted || false
        }

        setUser(userData)

        // 過濾掉已刪除的用戶
        const activeUsers = userDoc.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((user: User) => !user.deleted)

        setUsers(activeUsers)
        setTheme(currentUserDoc.data().theme || '')
        setLoading(false)
      } catch (error) {
        console.error('Error fetching users', error)
        toast.error('無法載入使用者資料，請稍後再試。')
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleRoleChange = async (uid: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole })
      setUsers(prev =>
        prev.map(user => (user.id === uid ? { ...user, role: newRole } : user))
      )
      await fetch('/api/set-custom-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, role: newRole }),
      })
    } catch (error) {
      console.error('角色更新失敗', error)
      toast.error('更新角色時發生錯誤，請稍後再試。')
    }
  }

  const handleDeleteUser = async (uid: string) => {
    setTimeout( () => {
      toast.info('確認要刪除此帳號嗎?',{
      action: {
        label: '確認',
        onClick: () => {handleDeleteUser(uid)}
      },
      cancel: {
        label: '取消',
        onClick: () => {return}
      }
    })}, 3000)
    try {
      await updateDoc(doc(db, 'users', uid), { deleted: true })
      setUsers(prev =>
        prev.map(user => (user.id === uid ? { ...user, deleted: true } : user))
      )
      await fetch('/api/set-custom-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      })
      toast.success('使用者帳號已刪除')
    } catch (error) {
      console.error('刪除失敗', error)
      toast.error('刪除帳號時發生錯誤，請稍後再試。')
    }
  }

  const handleUndoUser = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), { deleted: false })
      setUsers(prev =>
        prev.map(user => (user.id === uid ? { ...user, deleted: false } : user))
      )
      await fetch('/api/set-custom-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      })
      toast.success('使用者帳號已回復')
    } catch (error) {
      console.error('回復失敗', error)
      toast.error('回復帳號時發生錯誤，請稍後再試。')
    }
  }

  if (loading) return <p className="p-6">載入中...</p>

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <Toaster richColors position="bottom-right" />
      <h1 className="text-2xl font-bold mb-4">🔐 管理員後台</h1>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-zinc-200/20 text-left">
              <th className="border px-4 py-2 min-w-[8rem]">名稱</th>
              <th className="border px-4 py-2 min-w-[12rem]">Email</th>
              <th className="border px-4 py-2 min-w-[6rem]">角色</th>
              <th className="border px-4 py-2 min-w-[16rem]">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              if (u.deleted) {
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="border px-4 py-2">{u.name || '未設定'}</td>
                    <td className="border px-4 py-2">{u.email || '未提供'}</td>
                    <td className="border px-4 py-2 capitalize">{u.role || 'N/A'}</td>
                    <td className="border px-4 py-2 flex gap-2">
                      <p className="text-gray-400 italic">(此帳號已遭刪除)</p>
                      <Button
                        variant="undo"
                        onClick={() => handleUndoUser(u.id)}
                      >
                        回復
                      </Button>
                    </td>
                  </tr>
                );
              } else {
                return (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="border px-4 py-2">{u.name || '未設定'}</td>
                    <td className="border px-4 py-2">{u.email || '未提供'}</td>
                    <td className="border px-4 py-2 capitalize">{u.role || 'N/A'}</td>
                    <td className="border px-4 py-2">
                      {u.role !== 'admin' ? (
                        <div className="flex gap-2">
                          <Button
                            variant="submit"
                            onClick={() => handleRoleChange(u.id, 'user')}
                            className="bg-blue-600 text-white px-3 py-1"
                          >
                            設為使用者
                          </Button>
                          <Button
                            variant="default"
                            onClick={() => handleRoleChange(u.id, 'pending')}
                            className="bg-yellow-600 text-white px-3 py-1"
                          >
                            設為待審
                          </Button>
                          <Button
                            variant="delete"
                            onClick={() => handleDeleteUser(u.id)}
                            className="bg-red-600 text-white px-3 py-1"
                          >
                            刪除
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">管理員</span>
                      )}
                    </td>
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>
    </main>
  )
}