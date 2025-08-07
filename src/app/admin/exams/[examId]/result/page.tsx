'use client'
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Exam } from '@/types/exam'
import { Question, renderContent, renderResults } from '@/types/question'
import { Toaster, toast } from 'sonner'

export default function AdminExamResultPage() {
  const { examId } = useParams()
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [userAnswers, setUserAnswers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const examSnap = await getDoc(doc(db, 'exams', examId as string))
      if (!examSnap.exists()) return

      const examData = examSnap.data() as Exam
      setExam({ ...examData, id: examSnap.id })

      const questionDocs = await Promise.all(
        examData.questionIds.map((q) =>
          getDoc(doc(db, 'questions', q.questionId))
        )
      )
      const validQuestions = questionDocs
        .filter((doc) => doc.exists())
        .map((doc) => ({ ...(doc.data() as Question), id: doc.id }))
      setQuestions(validQuestions)

      const answerSnap = await getDocs(
        query(collection(db, 'userAnswers'), where('examId', '==', examId))
      )
      const allAnswers = answerSnap.docs.map(doc => doc.data())
      setUserAnswers(allAnswers)
      setLoading(false)
    }
    fetchData()
  }, [examId])

  const computeStats = (questionId: string) => {
    const related = userAnswers.map((record) => {
      const answer = record.answers?.[questionId]
      return answer !== undefined ? { answer } : null
    }).filter(Boolean)

    const total = related.length
    const counts: Record<string, number> = {}
    let correctCount = 0
    const question = questions.find((q) => q.id === questionId)
    if (!question) return { total, correct: 0, distribution: {} }

    related.forEach((ua) => {
      const ans = ua!.answer
      if (question.type !== 'multiple') {
        const key = typeof ans === 'string' ? ans : JSON.stringify(ans)
        counts[key] = (counts[key] || 0) + 1
      } else {
        ans.map((key: any) => {
          counts[key] = (counts[key] || 0) + 1
        }
      )}
      const isCorrect = (() => {
        switch (question.type) {
          case 'truefalse':
          case 'single':
            return ans === question.answers as number
          case 'multiple':
            if (Array.isArray(ans) && Array.isArray(question.answers)) {
              return (
                ans.length === (question.answers as number[]).length &&
                ans.every((a: any) => (question.answers as number[]).includes(a))
              )
            }
          case 'ordering':
          case 'matching':
            return JSON.stringify(ans) === JSON.stringify(question.answers)
          default:
            return false
        }
      })()
      if (isCorrect) correctCount++
    })
    return {
      total,
      correct: correctCount,
      distribution: counts,
    }
  }

  const chartData = questions.map((q, idx) => {
    const stats = computeStats(q.id)
    const rate = stats.total === 0 ? 0 : (stats.correct / stats.total) * 100
    return {
      name: `Q${idx + 1}`,
      correctRate: Number(rate.toFixed(1))
    }
  })

  if (userAnswers.length === 0) return <div className="p-5 text-gray-400 text-center">🤔無統計資料</div>
  if (!exam) return <div className="p-5 text-gray-400 text-center">載入中...</div>

  return (
    <main>
      <h1>{exam.title} 統計數據</h1>
      <p><QueryStatsIcon/> 作答人數：{userAnswers.length}</p>
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="name" />
            <YAxis domain={[0, 100]} />
            <Tooltip />
            <Bar dataKey="correctRate">
              {chartData.map((obj, idx) => (
                <Cell key={`cell-${idx}`} fill={getColorByRate(obj.correctRate)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {questions.map((q, idx) => {
        const stats = computeStats(q.id)
        const rate = stats.total === 0 ? 0 : (stats.correct / stats.total) * 100
        return (
          <div
            key={q.id}
            className={`border rounded p-4 shadow-sm space-y-2 ${getBackgroundClass(rate)}`}
          >
            <h2 className="font-semibold text-lg">第 {idx + 1} 題</h2>
            <div className="prose max-w-none text-xl font-semibold">{renderContent(q.question)}</div>
            <p>正確率：{rate.toFixed(1)}%</p>
            <p>作答人數：{stats.total} 人</p>
            {renderResults(q, stats.distribution, stats.total)}
          </div>
        )
      })}
    </main>
  )
}

const getBackgroundClass = (rate) => {
  // Ensure the rate is between 0 and 100
  const clampedRate = Math.max(0, Math.min(100, rate))

  // Calculate the class based on the correct rate (from red to green)
  if (clampedRate <= 20) {
    return 'bg-red-50/20 border-red-500/50' // Low rate: red background with opacity
  } else if (clampedRate <= 40) {
    return 'bg-red-200/20 border-red-200/50' // Still bad, but better
  } else if (clampedRate <= 60) {
    return 'bg-yellow-200/20 border-yellow-200/50' // Yellow background for a medium score
  } else if (clampedRate <= 80) {
    return 'bg-green-200/20 border-green-200/50' // Almost good, but still a little improvement
  } else {
    return 'bg-green-50/20 border-green-500/50' // High rate: green background with opacity
  }
}

  function getColorByRate(rate: number) {
    if (isNaN(rate)) return '#ccc'
    const r = Math.round(500 - (rate * 5))
    const g = Math.round(0 + (rate * 5))
    const b = 0
    return `rgba(${r}, ${g}, ${b}, 0.35)`
  }