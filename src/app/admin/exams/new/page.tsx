'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  collection, doc, getDocs, query, orderBy, where, Timestamp, serverTimestamp, setDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import ProtectedRoute from '@/components/ProtectedRoute'
import 'katex/dist/katex.min.css'
import { Toaster, toast } from 'sonner'
import { Button } from '@/components/button'
import { useRouter } from 'next/navigation'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/accordion'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/select'
import { Input } from '@/components/input'
import { Textarea } from '@/components/textarea'
import { Question, renderContent, renderOptions } from '@/types/question'
import { questionTypeLabels, groupTypeLabels } from '@/components/labels'
import { v4 as uuidv4 } from 'uuid'

export default function NewExamPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [selectedIds, setSelectedIds] = useState<Record<string, number>>({})
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [groupType, setGroupType] = useState<'highschool' | 'prep' | 'review'>('highschool')
  const [openAt, setOpenAt] = useState('')
  const [closeAt, setCloseAt] = useState('')
  const [answerAvailableAt, setAnswerAvailableAt] = useState('')
  const [timeLimit, setTimeLimit] = useState('')
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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

  useEffect(() => {
    const now = new Date()
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    if (groupType === 'highschool') {
      setOpenAt('')
      setCloseAt('')
      setAnswerAvailableAt('')
      setTimeLimit('')
      setSelectedIds({})
    } else {
      setOpenAt(now.toISOString().slice(0, 16))
      setCloseAt(oneWeekLater.toISOString().slice(0, 16))
      setAnswerAvailableAt(oneWeekLater.toISOString().slice(0, 16))
      setTimeLimit('50')
    }
  }, [groupType])

  const filteredAll = questions.filter(q =>
    q.groupType === groupType &&
    q.question?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredQuestions = filteredAll.slice(0, pageSize)

  const handleGroupTypeChange = (newType: typeof groupType) => {
    if (Object.keys(selectedIds).length > 0 && newType !== groupType) {
      toast.warning(`更換分類為「${groupTypeLabels[newType]}」將會清除目前選擇的題目。`, {
        duration: 5000,
        action: {
          label: '確定切換',
          onClick: () => {
            setGroupType(newType)
            setSelectedIds({})
          }
        }
      })
    } else {
      setGroupType(newType)
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => ({
      ...prev,
      [id]: prev[id] ? 0 : 1
    }))
  }

  const updateScore = (id: string, score: number) => {
    setSelectedIds(prev => ({
      ...prev,
      [id]: score
    }))
  }

  const handleSubmit = async () => {
    if (!title.trim()) return toast.error('請輸入考試標題')
    const selected = Object.entries(selectedIds).filter(([_, score]) => score)
    if (!selected.length) return toast.error('請至少選擇一題')
    const isValidDateTime = (s: string) => {
      return !isNaN(new Date(s).getTime())
    }
    if (openAt && !isValidDateTime(openAt)) {
      return toast.error('測驗開始時間格式有誤')
    }
    if (closeAt && !isValidDateTime(closeAt)) {
      return toast.error('測驗結束時間格式有誤')
    }
    if (openAt && closeAt) {
      const openTime = new Date(openAt).getTime()
      const closeTime = new Date(closeAt).getTime()
      if (closeTime < openTime) {
        return toast.error('結束時間不得早於開始時間')
      }
    }
    if (answerAvailableAt && !isValidDateTime(answerAvailableAt)) {
      return toast.error('解答公布時間格式有誤')
    }
    if (timeLimit && (isNaN(Number(timeLimit)) || Number(timeLimit) < 0)) {
      return toast.error('作答時長有誤')
    }
    const id = uuidv4()
    await setDoc(doc(db, 'exams', id), {
      id,
      title,
      description,
      questionIds: selected.map(([questionId, score]) => ({ questionId, score })),
      groupType,
      openAt: openAt ? Timestamp.fromDate(new Date(openAt)) : null,
      closeAt: closeAt ? Timestamp.fromDate(new Date(closeAt)) : null,
      answerAvailableAt: answerAvailableAt ? Timestamp.fromDate(new Date(answerAvailableAt)) : null,
      createdAt: serverTimestamp(),
      ...(timeLimit ? { timeLimit: parseFloat(timeLimit) } : {}),
      deleted: false
    })
    toast.success('考試已建立')
    sessionStorage.setItem('examListGroupType', groupType)
    setTimeout(() => router.push(`/admin/exams/list`), 1000)
  }

  return (
    <ProtectedRoute>
      <main className="p-6 max-w-5xl mx-auto space-y-5">
        <Toaster richColors closeButton position="bottom-right" />
        <h1 className="text-2xl font-bold">💯 新增考試</h1>

        <Input value={title} className="bg-zinc-200/20" onChange={e => setTitle(e.target.value)} placeholder="考試標題（必填）" />
        <Textarea value={description} className="bg-zinc-200/20" onChange={e => setDescription(e.target.value)} placeholder="考試說明（選填）" />

        <Select value={groupType} onValueChange={handleGroupTypeChange}>
          <SelectTrigger className="w-60 mt-2 bg-zinc-200/20">
            <SelectValue placeholder="選擇分類" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(groupTypeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {groupType !== 'highschool' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block mb-1">測驗開始時間</label>
              <Input
                className='bg-zinc-200/20'
                type="datetime-local"
                value={openAt}
                onChange={e => setOpenAt(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1">測驗結束時間</label>
              <Input
                className='bg-zinc-200/20'
                type="datetime-local"
                value={closeAt}
                onChange={e => setCloseAt(e.target.value)}
              />
            </div>
            <div>
              <label className="block mb-1">解答公布時間</label>
              <Input
                className='bg-zinc-200/20'
                type="datetime-local"
                value={answerAvailableAt}
                onChange={e => setAnswerAvailableAt(e.target.value)}
              />
            </div>
            <label className="block mb-1">作答時長限制（分鐘）</label>
            <Input
              className='bg-zinc-200/20'
              type="number"
              step="0.1"
              min="0"
              value={timeLimit}
              onChange={e => setTimeLimit(e.target.value)}
            />
          </div>
        )}

        {loading ? (
          <p className='p-6 text-gray-400 text-center'>載入中...</p>
        ) : (
          <>
            {filteredQuestions.map((q, index) => (
              <div key={q.id} className={`${!!selectedIds[q.id] ? 'bg-zinc-200/20' : 'bg-transparent'} border border-gray-300 rounded-xl p-4 shadow space-y-3 bg-zinc-200/20`}>
                <div className="flex items-center gap-4">
                  <input type="checkbox" checked={!!selectedIds[q.id]} onChange={() => toggleSelect(q.id)} />
                  {groupType !== 'highschool' && (
                    <Input
                      type="number"
                      className="w-24 bg-neutral-500/20"
                      value={selectedIds[q.id] || ''}
                      onChange={e => updateScore(q.id, Number(e.target.value))}
                      disabled={!selectedIds[q.id]}
                      placeholder="配分"
                    />
                  )}
                </div>
                <div>
                  Q{index + 1} #{groupTypeLabels[q.groupType]} - {questionTypeLabels[q.type]}
                </div>
                <div className="text-xl font-semibold">{renderContent(q.question)}</div>
                {renderOptions(q)}
                <Accordion type="single" collapsible className="mt-3 text-gray-400">
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
              <Button onClick={() => setPageSize(prev => prev + 10)} className="mt-4">
                ⬇️ 載入更多
              </Button>
            )}
          </>
        )}
        <Button variant="create" onClick={handleSubmit}>📤 建立考試</Button>
      </main>
    </ProtectedRoute>
  )
}
