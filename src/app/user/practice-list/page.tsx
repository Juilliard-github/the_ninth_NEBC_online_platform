'use client'
import DrawIcon from '@mui/icons-material/Draw';
import DoDisturbOnIcon from '@mui/icons-material/DoDisturbOn';
import LaunchIcon from '@mui/icons-material/Launch';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import { useEffect, useState, useCallback } from 'react'
import { db } from '@/lib/firebase'
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/button'
import { toast } from 'sonner'
import { Exam } from '@/types/exam'
import { AnimatePresence } from 'framer-motion'
import { Card } from '@/components/card'
import { getAuth } from 'firebase/auth'

export default function PracticeListPage() {
  const router = useRouter()
  const [exams, setExams] = useState<Exam[]>([])
  const [highschoolExams, setHighschoolExams] = useState<Exam[]>([])
  const [now, setNow] = useState(new Date())
  const [answeredExamIds, setAnsweredExamIds] = useState<Set<string>>(new Set())
  const pathname = usePathname()

  useEffect(() => {
    const handleScrollToHash = () => {
      const hash = window.location.hash
      if (hash) {
        const targetSection = document.querySelector(hash)
        if (targetSection) {
          setTimeout(() => {targetSection.scrollIntoView({
            behavior: 'smooth',  
            block: 'start',      
          })}, 500)
        }
      }
    }
    handleScrollToHash()

    const hashChangeListener = () => {
      handleScrollToHash()
    }
    window.addEventListener('hashchange', hashChangeListener)

    return () => {
      window.removeEventListener('hashchange', hashChangeListener)
    }
  }, [pathname])  

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const examSnap = await getDocs(query(
        collection(db, 'exams'),
        where('deleted', '==', false),
        where('groupType', 'in', ['prep', 'review']),
        orderBy('createdAt', 'desc')
      ))
      const favSnap = await getDocs(query(
        collection(db, 'questions'),
        where('isFavorite', '==', true),
        orderBy('createdAt', 'desc')
      ))
      const highschoolSnap = await getDocs(query(
        collection(db, 'exams'),
        where('deleted', '==', false),
        where('groupType', '==', 'highschool'),
        orderBy('createdAt', 'desc')
      ))


      setExams(examSnap.docs.map(d => ({ id: d.id, ...d.data() } as Exam)))
      setHighschoolExams(highschoolSnap.docs.map(d => ({ id: d.id, ...d.data() } as Exam)))
    } catch (e) {
      toast.error('無法取得資料')
      console.error(e)
    }
  }, [])


  useEffect(() => {
    fetchData()
  }, [])

  const nowTs = serverTimestamp()
  const notYetOpen = exams.filter(e => e.openAt && nowTs < e.openAt)
  const openExams = exams.filter(e => e.openAt && e.closeAt && nowTs >= e.openAt && nowTs <= e.closeAt)
  const expiredExams = exams.filter(e => e.closeAt && nowTs > e.closeAt)


  const handleTakeExam = (exam: Exam) => {
    const now = serverTimestamp()
    if (exam.openAt && now < exam.openAt) return toast.warning('此考試尚未開放作答')
    if (exam.closeAt && now > exam.closeAt) return toast.warning('此考試作答時間已結束')
    router.push(`/user/exams/${exam.id}/take`)
  }


  const formatDate = (ts?: any) => {
    if (!ts || typeof ts.toDate !== 'function') return '未設定'
    const d = ts.toDate()
    return d.toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    })
  }

  useEffect(() => {
    const unsubscribe = getAuth().onAuthStateChanged(async (user) => {
      if (!user) return

      const snap = await getDocs(collection(db, 'users', user.uid, 'answeredExams'))
      const answeredIds = new Set<string>()
      snap.forEach(doc => answeredIds.add(doc.id))
      setAnsweredExamIds(answeredIds)
    })

    return () => unsubscribe()
  }, [])



  const renderExamCard = (exam: Exam, action?: React.ReactNode) => {
    return (
      <Card key={exam.id} className="container2">
        <h2 className="text-xl font-semibold">{exam.title || '未命名考試'}</h2>
        <div className="text-gray-400">{exam.description || '無說明'}</div>
        <div className="space-y-1">
          {(exam.groupType === 'prep' || exam.groupType === 'review') && (
            <>
              <p>📅 作答時間：{formatDate(exam.openAt)} ~ {formatDate(exam.closeAt)}</p>
              <p>🕒 解答公布：{formatDate(exam.answerAvailableAt)}</p>
              <p>⏱️ 作答時限：{exam.timeLimit ? `${exam.timeLimit} 分鐘` : '不限時間'}</p>
            </>
          )}
          <p>題目數量：{exam.questionIds?.length ?? 0}</p>
        </div>
        {(exam.openAt && now <= exam.openAt.toDate()) ? (
          <span className="text-gray-400 text-center">尚未開放考試</span>
          
        ) : (!answeredExamIds.has(exam.id))? (
          <Button variant="view" onClick={() => router.push(`/user/exams/${exam.id}/take`)}>
            開始作答
          </Button>
        ) : exam.groupType === 'highschool' ? (
          <Button variant="view" onClick={() => router.push(`/user/exams/${exam.id}/my-result`)}>
            查看結果
          </Button>
        ) : (exam.answerAvailableAt && now >= exam.answerAvailableAt.toDate()) ? (
          <Button variant="view" onClick={() => router.push(`/user/exams/${exam.id}/my-result`)}>
            查看結果
          </Button>
        ) : (
          <span className="text-gray-400 text-center">尚未公布解答</span>
        )}
      </Card>
    )
  }

  return (
    <main>
      <AnimatePresence>
            {/* 三種狀態考試 */}
            {[{
              id: 'not-yet-open', title: <><HourglassBottomIcon/> 尚未開放考試</>, data: notYetOpen,
              empty: '沒有尚未開放的考試',
            }, {
              id: 'open-now', title: <><LaunchIcon/> 開放中考試</>, data: openExams,
              empty: '目前無可作答考試',
              renderAction: (e: Exam) => <Button variant="view" onClick={() => handleTakeExam(e)}>開始作答</Button>,
            }, {
              id: 'expired', title: <><DoDisturbOnIcon/> 已結束考試</>, data: expiredExams,
              empty: '沒有已結束的考試',
            }].map(({ id, title, data, empty, renderAction }) => (
              <section id={id} key={id} className="scroll-mt-18 space-y-4 border-t pt-6">
                <h2 className="text-2xl font-semibold">{title}</h2>
                {data.length === 0 ? (
                  <p className="text-gray-400">{empty}</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {data.map(e => renderExamCard(e, renderAction?.(e)))}
                  </div>
                )}
              </section>
            ))}


            {/* 高中練習 */}
            <section id="highschool" className="scroll-mt-40 space-y-4 border-t pt-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-2xl font-semibold"><DrawIcon/> 高中章節自由練習</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {highschoolExams
                  .map(e => renderExamCard(e,
                    <Button variant="view" onClick={() => router.push(`/user/exams/${e.id}/take`)}>開始練習</Button>
                  ))}
              </div>
            </section>
      </AnimatePresence>
    </main>
  )
}

