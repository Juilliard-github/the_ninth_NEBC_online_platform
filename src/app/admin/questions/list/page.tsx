'use client'

import { useEffect, useState, useCallback } from 'react'
import { collection, doc, getDocs, query, orderBy, where, updateDoc, addDoc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import ProtectedRoute from '@/components/ProtectedRoute'
import 'katex/dist/katex.min.css'
import { Toaster, toast } from 'sonner'
import { Button } from '@/components/button'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/accordion'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/select'
import { Question, renderContent, renderOptions } from '@/types/question'
import { groupTypeLabels } from '@/components/labels'
import { useRouter } from 'next/navigation'

export default function QuestionListPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [search, setSearch] = useState('')
  const [groupType, setGroupType] = useState<Question['groupType']>('highschool')
  const [loading, setLoading] = useState(true)
  const [pageSize, setPageSize] = useState(10)
  const router = useRouter()

  useEffect(() => {
    const saved = sessionStorage.getItem('questionListGroupType')
    if (saved === 'prep' || saved === 'review' || saved === 'highschool') {
      setGroupType(saved)
      sessionStorage.removeItem('questionListGroupType') // 清除以避免後續影響
    }
  }, [])

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    const qSnap = await getDocs(query(
      collection(db, 'questions'),
      orderBy('createdAt', 'desc'),
      where('deleted', '==', false)
    ))
    const data = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question))
    setQuestions(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchQuestions()
  }, [fetchQuestions])

  const handleDelete = async (id: string) => {
    await updateDoc(doc(db, 'questions', id), {
      deleted: true,
      updatedAt: Timestamp.now()
    })
    setQuestions(prev => prev.filter(q => q.id !== id))
    toast.error('🗑️ 題目已刪除', {
      description: '5 秒內可還原',
      action: {
        label: '還原',
        onClick: () => handleRestore(id)
      }
    })
  }

  const handleRestore = async (id: string) => {
    try {
      await updateDoc(doc(db, 'questions', id), {
        deleted: false,
        updatedAt: Timestamp.now()
      })
      toast.success('題目已還原')
      fetchQuestions()
    } catch (e) {
      toast.error('❌ 還原失敗')
      console.error(e)
    }
  }

  const handleDuplicate = async (q: Question) => {
    const { id, createdAt, updatedAt, ...rest } = q
    const docRef = await addDoc(collection(db, 'questions'), {
      ...rest,
      createdAt: Timestamp.now(),
      deleted: false,
      updatedAt: Timestamp.now()
    })
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const newQ = { id: docRef.id, ...docSnap.data() } as Question
      setQuestions(prev => [newQ, ...prev])
      toast.success('📄 已複製題目')
    }
  }

  const filteredAll = questions.filter(q =>
    q.groupType === groupType &&
    q.question?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredQuestions = filteredAll.slice(0, pageSize)

  return (
    <ProtectedRoute>
      <main className="max-w-5xl mx-auto space-y-5">
        <Toaster richColors position='bottom-right' />
        <h1 className="text-2xl font-bold">📚 題目清單</h1>

        <div className="flex flex-col md:flex-row items-center gap-4">
          <Select value={groupType} onValueChange={val => setGroupType(val as Question['groupType'])}>
            <SelectTrigger className="w-60 rounded-xl border-gray-300 bg-zinc-200/20">
              <SelectValue placeholder="選擇分類" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(groupTypeLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-600 focus:ring-2 focus:ring-blue-400 px-4 py-2 rounded-xl w-full transition"
            placeholder="🔍 搜尋題目內容..."
          />
        </div>

        {loading ? (
          <p>載入中...</p>
        ) : (
          <>
            {filteredQuestions.length === 0 && (
              <div className="text-center">暫無題目</div>
            )}
            {filteredQuestions.map((q, index) => (
              <div
                key={q.id}
                className="border border-gray-300 bg-zinc-200/20 rounded-2xl p-5 shadow-md space-y-4 transition"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">Q{index + 1}</span>
                  <div className="inline-flex justify-center gap-2">
                    <Button variant="copy" onClick={() => handleDuplicate(q)}>📄 複製</Button>
                    <Button variant="edit" onClick={() => router.push(`/admin/questions/${q.id}/edit`)}>✏️ 編輯</Button>
                    <Button variant="delete" onClick={() => handleDelete(q.id)}>🗑️ 刪除</Button>
                  </div>
                </div>

                <div className="text-sm font-medium">
                  {renderContent(q.question)}
                </div>
                {renderOptions(q)}

                <Accordion type="single" collapsible className="mt-2 text-gray-400">
                  <AccordionItem value="explanation">
                    <AccordionTrigger>📖 查看詳解</AccordionTrigger>
                    <AccordionContent>
                      {q.explanation ? renderContent(q.explanation) : '（無詳解）'}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            ))}

            {filteredQuestions.length < filteredAll.length && (
              <Button
                onClick={() => setPageSize(prev => prev + 10)}
                className="mt-3"
              >
                ⬇️ 載入更多
              </Button>
            )}
          </>
        )}
      </main>
    </ProtectedRoute>
  )
}