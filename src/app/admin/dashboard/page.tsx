'use client'

import { Button } from '@/components/button'
import { use, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [theme, setTheme] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/')
        return
      }

      const userDoc = await getDocs(collection(db, 'users'))
      const currentUserDoc = userDoc.docs.find(doc => doc.id === currentUser.uid)

      if (!currentUserDoc || currentUserDoc.data().role !== 'admin') {
        alert('你沒有權限進入此頁面')
        router.push('/')
        return
      }

      setUser(currentUser)
      setUsers(userDoc.docs.map(doc => ({ id: doc.id, ...doc.data() })))
      setTheme(currentUserDoc.data().theme)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const handleRoleChange = async (uid: string, newRole: string) => {
    await updateDoc(doc(db, 'users', uid), { role: newRole })
    setUsers(prev =>
      prev.map(user => (user.id === uid ? { ...user, role: newRole } : user))
    )
    await fetch('/api/set-custom-claims', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, role: newRole }),
    })
  }

  const handleDeleteUser = async (uid: string) => {
    const confirmDelete = window.confirm('確認要刪除此帳號嗎? 此操作無法復原。')
    if (!confirmDelete) return
    try {
      await deleteDoc(doc(db, 'users', uid))
      const favsRef = collection(db, 'users', uid, 'favorites')
      const favsSnap = await getDocs(favsRef)
      const deletePromises = favsSnap.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)
      setUsers(prev => prev.filter(user => user.id !== uid))
      alert('使用者帳號已刪除')
    } catch (error) {
      console.error('刪除失敗', error)
      alert('刪除帳號時發生錯誤，請稍後再試。')
    }
  }



  if (loading) return <p className="p-6">載入中...</p>

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🔐 管理員後台</h1>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 rounded-xl overflow-hidden text-sm">
          <thead>
            <tr className="bg-zinc-200/10 text-left">
              <th className="border px-4 py-2 min-w-[8rem]">名稱</th>
              <th className="border px-4 py-2 min-w-[12rem]">Email</th>
              <th className="border px-4 py-2 min-w-[6rem]">角色</th>
              <th className="border px-4 py-2 min-w-[16rem]">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="border px-4 py-2">{u.name || '未設定'}</td>
                <td className="border px-4 py-2">{u.email || '未提供'}</td>
                <td className="border px-4 py-2 capitalize">{u.role || 'N/A'}</td>
                <td className="border px-4 py-2">
                  {u.role !== 'admin' ? (
                    <div className="flex gap-2">
                      <Button variant="submit" onClick={() => handleRoleChange(u.id, 'user')} className="bg-blue-600 text-white px-3 py-1">
                        設為使用者
                      </Button>
                      <Button variant="default" onClick={() => handleRoleChange(u.id, 'pending')} className="bg-yellow-600 text-white px-3 py-1">
                        設為待審
                      </Button>
                      <Button variant="delete" onClick={() => handleDeleteUser(u.id)} className="bg-red-600 text-white px-3 py-1">
                        刪除
                      </Button>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">管理員</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  )
}