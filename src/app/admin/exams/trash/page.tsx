'use client'

import { useEffect, useState, useCallback } from 'react'
import { db } from '@/lib/firebase'
import {
  collection, getDocs, deleteDoc, updateDoc, doc,
  serverTimestamp, query, where, orderBy
} from 'firebase/firestore'
import { Button } from '@/components/button'
import { Toaster, toast } from 'sonner'
import { Exam } from '@/types/exam'

export default function DeletedExamsPage() {
  const [deletedExams, setDeletedExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDeletedExams = useCallback(async () => {
    setLoading(true)
    try {
      const qSnap = await getDocs(query(
        collection(db, 'exams'),
        where('deleted', '==', true),
        orderBy('createdAt','desc')
      ))
      const data = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam))
      setDeletedExams(data)
    } catch (e) {
      console.error('⚠️ 載入失敗，可能需要建立 Firebase 索引', e)
      toast.error('無法載入已刪除考試')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDeletedExams()
  }, [fetchDeletedExams])

  const handleRestore = async (id: string) => {
    try {
      await updateDoc(doc(db, 'exams', id), {
        deleted: false,
        updatedAt: serverTimestamp()
      })
      toast.success('已還原考試')
      setDeletedExams(prev => prev.filter(e => e.id !== id))
    } catch (e) {
      toast.error('還原失敗')
      console.error(e)
    }
  }

  const handlePermanentDelete = (id: string) => {
    toast.warning('確定要永久刪除嗎？', {
      duration: 10000,
      description: '此操作無法復原',
      action: {
        label: '確定刪除',
        onClick: async () => {
          try {
            await deleteDoc(doc(db, 'exams', id))
            toast.success('已永久刪除考試')
            setDeletedExams(prev => prev.filter(e => e.id !== id))
          } catch (e) {
            toast.error('永久刪除失敗')
            console.error(e)
          }
        }
      },
      cancel: {
        label: '取消',
        onClick: () => {
          toast.success('已取消刪除')
        }
      }
    })
  }
  
  function formatDate(ts?: any) {
    if (!ts || typeof ts.toDate !== 'function') return '未設定'
    const d = ts.toDate()
    return d.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <h1 className="text-2xl font-bold">🗑️ 考試垃圾桶</h1>
      <Toaster richColors closeButton position="bottom-right" />
      {loading && <p className="p-6 text-gray-400 text-center">載入中...</p>}
      {!loading && deletedExams.length === 0 && (
        <p>沒有已刪除的考試</p>
      )}
      {deletedExams.map((exam) => (
        <div key={exam.id} className="border p-4 rounded bg-zinc-200/20">
          <div className="flex justify-between items-center">
          <span className="font-semibold text-lg">
            {exam.title || '未命名考試'}
          </span>
          <div className="inline-flex justify-center gap-2">
            <Button variant="undo" onClick={() => handleRestore(exam.id)}>還原</Button>
            <Button variant="delete"  onClick={() => handlePermanentDelete(exam.id)}>永久刪除</Button>
          </div>
        </div>
          <p className="text-gray-400 mb-2">{exam.description || '無說明'}</p>

          <div className="space-y-1 mb-3">
            {exam.groupType !== 'highschool' && (
              <>
                <p>📅 作答時間：{formatDate(exam.openAt)} ～ {formatDate(exam.closeAt)}</p>
                <p>🕒 解答公布：{formatDate(exam.answerAvailableAt)}</p>
                <p>⏱️ 作答時限：{exam.timeLimit ? `${exam.timeLimit} 分鐘` : '不限時間'}</p>
              </>
            )}
            <p>📝 題目數量：{exam.questionIds?.length ?? 0}</p>
          </div>
        </div>
      ))}
    </div>
  )
}