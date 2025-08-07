'use client'
import ViewListIcon from '@mui/icons-material/ViewList';
import { useEffect, useState, useCallback } from 'react'
import { db } from '@/lib/firebase'
import { Exam } from '@/types/exam'
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  serverTimestamp,
  addDoc,
  getDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore'
import { Button } from '@/components/button'
import { Input } from '@/components/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/select'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { renderContent } from '@/types/question'

export default function ManageExamsPage() {
  const [allExams, setAllExams] = useState<Exam[]>([])
  const [filteredExams, setFilteredExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const router = useRouter()
  const [groupType, setGroupType] = useState<Exam['groupType']>('highschool')

  useEffect(() => {
    const saved = sessionStorage.getItem('examListGroupType')
    if (saved === 'prep' || saved === 'review' || saved === 'highschool') {
      setGroupType(saved)
      sessionStorage.removeItem('examListGroupType') // 清除以避免後續影響
    }
    fetchExams()
  }, [])


  const fetchExams = useCallback(async () => {
    setLoading(true)
    try {
      const q = query(
        collection(db, 'exams'),
        where('deleted', '==', false),
        orderBy('createdAt', 'desc')
      )
      const snapshot = await getDocs(q)
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Exam))
      setAllExams(data)
    } catch (e) {
      toast.error('無法取得資料（可能需要建立 Firestore 索引）')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  // 🔍 濾掉不符合搜尋條件和 groupType 的資料
  useEffect(() => {
    const filtered = allExams.filter(exam =>
      exam.groupType === groupType &&
      (exam.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.description.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    setFilteredExams(filtered)
  }, [allExams, groupType, searchTerm])

  const handleUpdate = async (id: string) => {
    const target = allExams.find(q => q.id === id)
    if (!target) return

    try {
      await updateDoc(doc(db, 'exams', id), {
        deleted: true,
        updatedAt: serverTimestamp()
      })

      toast.error('考試已刪除', {
        description: '5 秒內可還原',
        action: {
          label: '還原',
          onClick: () => handleRestore(id)
        }
      })

      setAllExams(prev => prev.filter(q => q.id !== id))

    } catch (e) {
      toast.error('刪除失敗')
      console.error(e)
    }
  }

  const handleRestore = async (id: string) => {
    try {
      await updateDoc(doc(db, 'exams', id), {
        deleted: false,
        updatedAt: serverTimestamp()
      })
      toast.success('題目已還原')
      fetchExams()
    } catch (e) {
      toast.error('還原失敗')
      console.error(e)
    }
  }

  const handleDuplicate = async (q: Exam) => {
    try {
      const { ...rest } = q
      const docRef = await addDoc(collection(db, 'exams'), {
        ...rest,
        createdAt: serverTimestamp(),
        deleted: false
      })
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const newE = { id: docRef.id, ...docSnap.data() } as Exam
        setAllExams(prev => [newE, ...prev])
        toast.success('已複製題目')
      }
    } catch (e) {
      toast.error('複製失敗')
      console.error(e)
    }
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
    <main>
      <h1><ViewListIcon/> 考試清單</h1>
      <div className='container1'>
        <Select value={groupType!} onValueChange={(val) => setGroupType(val as Exam['groupType'])}>
          <SelectTrigger className="bg-zinc-200/20 border border-gray-300 rounded-xl">
            <SelectValue placeholder="選擇類型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="highschool">高中章節</SelectItem>
            <SelectItem value="prep">課前先備知識</SelectItem>
            <SelectItem value="review">社課後複習</SelectItem>
          </SelectContent>
        </Select>

        <Input
          className="flex-1 bg-zinc-200/20"
          placeholder="輸入關鍵字搜尋"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {filteredExams.length === 0 && <p>查無符合的考試</p>}

      {filteredExams.map((exam) => (
        <div
          key={exam.id}
          className="container2"
        >            
        <div className="flex justify-between items-center">
          <span className="font-semibold text-xl">
            {exam.title || '未命名考試'}
          </span>
          <div className="inline-flex justify-center gap-2">
            <Button variant="submit" onClick={() => router.push(`/admin/exams/${exam.id}/leaderboard`)}>排行榜</Button>
            <Button variant="general" onClick={() => router.push(`/admin/exams/${exam.id}/result`)}>統計數據</Button>
            <Button variant="edit" onClick={() => router.push(`/admin/exams/${exam.id}/edit`)}>編輯</Button>
            <Button variant="copy" onClick={() => handleDuplicate(exam)}>複製</Button>
            <Button variant="delete" onClick={() => handleUpdate(exam.id)}>刪除</Button>
          </div>
        </div>
          <p className="text-gray-400 mb-2">{renderContent(exam.description) || '無說明'}</p>

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
    </main>
  )
}
