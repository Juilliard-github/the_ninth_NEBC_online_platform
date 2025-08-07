'use client'
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';

import { Button } from '@/components/button'
import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
  const [adminUsers, setAdminUsers] = useState<User[]>([])
  const [pendingUsers, setPendingUsers] = useState<User[]>([])
  const [activeUsers, setActiveUsers] = useState<User[]>([])
  const [deletedUsers, setDeletedUsers] = useState<User[]>([])
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
        
        setDeletedUsers(userDoc.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((user: User) => user.deleted))
        setAdminUsers(userDoc.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((user: User) => !user.deleted && user.role==='admin'))
        setActiveUsers(userDoc.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((user: User) => !user.deleted && user.role==='user'))
        setPendingUsers(userDoc.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter((user: User) => !user.deleted && user.role==='pending'))
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

  return (
    <main>
      <h1><SupervisorAccountIcon/> 管理員後台</h1>
      {[{
        id: 'adminUsers', title: '管理員', data: adminUsers,
        empty: '暫無管理員資料',
      },{
        id: 'pendingUsers', title: '待審核', data: pendingUsers,
        empty: '暫無待審核資料',
      }, {
        id: 'activeUsers', title: '使用者', data: activeUsers,
        empty: '暫無使用者資料',
      }, {
        id: 'deletedUsers', title: '已刪除', data: deletedUsers,
        empty: '暫無已刪除使用者',
      }].map(({ id, title, data, empty}) => (
        <section id={id} key={id}>
          <h2 className="text-xl font-semibold">{title}</h2>
          {data.length === 0 ? (
            <p className="text-gray-400">{empty}</p>
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr className="bg-zinc-200/20">
                    <th className='min-w-[8rem]'>使用者</th>
                    <th className='min-w-[12rem]'>Email</th>
                    <th className='min-w-[6rem]'>角色</th>
                    <th className='min-w-[16rem]'>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((u) => {
                    if (u.deleted) {
                      return (
                        <tr key={u.id}>
                          <td>{u.name || '未設定'}</td>
                          <td>{u.email || '未提供'}</td>
                          <td className="capitalize">{u.role || 'N/A'}</td>
                          <td className="flex gap-2">
                            <Button
                              variant="undo"
                              onClick={() => handleUndoUser(u.id)}
                            >
                              回復
                            </Button>                
                            <p className="text-gray-400 italic self-center">(此帳號已遭刪除)</p>
                          </td>
                        </tr>
                      )
                    } else {
                      return (
                        <tr key={u.id}>
                          <td>{u.name || '未設定'}</td>
                          <td>{u.email || '未提供'}</td>
                          <td className="capitalize">{u.role || 'N/A'}</td>
                          <td>
                            {u.role !== 'admin' ? (
                              <div className="flex gap-2">
                                {u.role === 'pending' ? (
                                <Button
                                  variant="submit"
                                  onClick={() => handleRoleChange(u.id, 'user')}
                                >
                                  設為使用者
                                </Button>
                                ) : (
                                <Button
                                  variant="pending"
                                  onClick={() => handleRoleChange(u.id, 'pending')}
                                >
                                  設為待審
                                </Button>
                                )}
                                <Button
                                  variant="delete"
                                  onClick={() => handleDeleteUser(u.id)}
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
          )}
        </section>
      ))}
    </main>
  )
}