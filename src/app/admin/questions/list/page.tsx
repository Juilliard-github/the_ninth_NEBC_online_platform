'use client'
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ViewListIcon from '@mui/icons-material/ViewList';
import MoreIcon from '@mui/icons-material/More';
import { useEffect, useState, useCallback } from 'react'
import { collection, doc, getDocs, query, orderBy, where, updateDoc, addDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import 'katex/dist/katex.min.css'
import { toast } from 'sonner'
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
    toast.warning('確定要刪除嗎？', {
      duration: 5000,
      action: {
        label: '確定',
        onClick: async () => {
          try {
            await updateDoc(doc(db, 'questions', id), {
              deleted: true,
              updatedAt: serverTimestamp()
            })
            setQuestions(prev => prev.filter(q => q.id !== id))
            toast.success('已移置垃圾桶')
          } catch (err) {
            console.error(err)
            toast.error('刪除失敗')
          }
        }
      }
    })
  }

  const handleDuplicate = async (q: Question) => {
    const { ...rest } = q
    const docRef = await addDoc(collection(db, 'questions'), {
      ...rest,
      createdAt: serverTimestamp(),
      deleted: false,
      updatedAt: serverTimestamp()
    })
    const docSnap = await getDoc(docRef)
    if (docSnap.exists()) {
      const newQ = { id: docRef.id, ...docSnap.data() } as Question
      setQuestions(prev => [newQ, ...prev])
      toast.success('已複製題目')
    }
  }

  const filteredAll = questions.filter(q =>
    q.groupType === groupType &&
    q.question?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredQuestions = filteredAll.slice(0, pageSize)

  return (
    <main>
      <h1><ViewListIcon/> 題目清單</h1>

      <div className="container1">
        <Select value={groupType} onValueChange={val => setGroupType(val as Question['groupType'])}>
          <SelectTrigger className="w-50 rounded-xl border border-gray-300 bg-zinc-200/20">
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

      <>
        {filteredQuestions.length === 0 && (
          <div className="text-center">暫無題目</div>
        )}
        {filteredQuestions.map((q) => (
          <div
            key={q.id}
            className="container2"
          >
            <div className="flex justify-between">
              <span className="text-xl font-semibold leading-flex whitespace-pre-wrap break-words break-all hyphens-auto">{renderContent(q.question)}</span>
              <div className="inline-flex gap-2">
                <Button variant="copy" onClick={() => handleDuplicate(q)}>📄 複製</Button>
                <Button variant="edit" onClick={() => router.push(`/admin/questions/${q.id}/edit`)}>✏️ 編輯</Button>
                <Button variant="delete" onClick={() => handleDelete(q.id)}>🗑️ 刪除</Button>
              </div>
            </div>
            {q.photoUrl && (
              <img
                src={q.photoUrl}
                alt="題目照片"
              />
            )}
            {renderOptions(q)}
            <Accordion type="single" collapsible>
              <AccordionItem value="explanation" className="text-gray-400 whitespace-pre-wrap break-words break-all hyphens-auto">
                <AccordionTrigger><MenuBookIcon/> 查看詳解</AccordionTrigger>
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
            className="mt-4"
          >
            <MoreIcon/> 載入更多
          </Button>
        )}
      </>
    </main>
  )
}