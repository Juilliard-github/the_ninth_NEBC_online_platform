'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { db, auth } from '@/lib/firebase'
import {
  doc, getDoc, setDoc, Timestamp
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Question, isUnanswered , renderContent } from '@/types/question'
import { Button } from '@/components/button'
import { Exam } from '@/types/exam'
import { Progress } from '@/components/progress'
import { toast, Toaster } from 'sonner'
import MatchingCanvas from '@/components/MatchingCanvas'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy
} from '@dnd-kit/sortable'
import SortableItem from '@/components/SortableItem_template'
import { arrayMove } from '@dnd-kit/sortable' 


export default function TakeExamPage() {
  const router = useRouter()
  const { examId } = useParams()
  const [userId, setUserId] = useState('')
  const [exam, setExam] = useState<Exam | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [endTime, setEndTime] = useState<Date | null>(null)
  const [timeLeft, setTimeLeft] = useState('')
  const [progress, setProgress] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [accessAllowed, setAccessAllowed] = useState(false)
  const [checking, setChecking] = useState(true)
  const [initialized, setInitialized] = useState<Record<string, boolean>>({})
  const [interacted, setInteracted] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false) // 用來鎖定 UI


  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    if (!userId) return // 避免 userId 尚未初始化

    const checkIfSubmitted = async () => {
      const answeredRef = doc(db, 'users', userId, 'answeredExams', examId as string)
      const answeredSnap = await getDoc(answeredRef)

      if (answeredSnap.exists()) {
        sessionStorage.setItem('fromAlreadySubmitted', '1')
        router.push(`/user/exams/${examId}/my-result`)
        return
      }

      setChecking(false)
    }

    checkIfSubmitted()
  }, [examId, userId])

  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (!examId || !user) return
      setUserId(user.uid)

      const examSnap = await getDoc(doc(db, 'exams', examId as string))
      const exam = examSnap.data() as Exam
      if (!exam) return


      const now = new Date()
      const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const openAt = exam.openAt?.toDate?.() ?? now.toISOString().slice(0, 16)
      const closeAt = exam.closeAt?.toDate?.() ?? oneWeekLater.toISOString().slice(0, 16)


      if (now < openAt || now > closeAt) {
        toast.error('目前非作答時間，請稍後再試')
        return
      }


      setAccessAllowed(true)
      const questionDocs = await Promise.all(
        (exam.questionIds || []).map((q) =>
          getDoc(doc(db, 'questions', q.questionId))
        )
      )
      const loadedQuestions = questionDocs
        .map((doc) => (doc.exists() ? ({ ...doc.data(), id: doc.id } as Question) : null))
        .filter((q): q is Question => q !== null)
      setQuestions(loadedQuestions)


      if (exam.timeLimit) setEndTime(new Date(Date.now() + Number(exam.timeLimit) * 60000))
      else if (exam.closeAt) setEndTime(exam.closeAt.toDate())
      setExam(exam)
    })
  }, [examId])


  useEffect(() => {
    const answeredCount = questions.filter(q => !isUnanswered(q, answers[q.id], interacted)).length
    const total = questions.length
    setProgress((answeredCount / total) * 100)
  }, [answers, questions])


  const handleAnswer = (qid: string, value: number | number[] | boolean) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }))
  }

  const forceSubmit = useCallback(async () => {
    if (submitted || submitting) return
    setSubmitting(true) // 鎖定 UI

    toast.info('⌛ 時間到，自動提交', { duration: 1000 }) 

    try {
      const userAnswerRef = doc(db, 'userAnswers', `${examId}_${userId}`)
      const answeredExamRef = doc(db, 'users', userId, 'answeredExams', examId as string)

      const userAnswerPayload = {
        examId,
        userId,
        createdAt: Timestamp.now(),
        answers,
        updatedAt: Timestamp.now(),
        totalScore: 0,
        correctCount: 0,
        totalQuestions: 0,
        toUpdate: true
      }

      await Promise.all([
        setDoc(userAnswerRef, userAnswerPayload)
      ])

      setSubmitted(true)
      toast.success('已提交')
      router.push(`/user/practice-list`)
    } catch (err) {
      console.error('提交作答失敗:', err)
      toast.error('提交失敗')
      setSubmitting(false)
    }
  }, [submitted, submitting, examId, userId, answers])


  const handleSubmit = async () => {
    if (submitted) return

    const unanswered = questions.filter(q => isUnanswered(q, answers[q.id], interacted))

    if (unanswered.length > 0) {
      let autoSubmitTimer: NodeJS.Timeout

      const submit = async () => {
        clearTimeout(autoSubmitTimer)
        try {
          const userAnswerRef = doc(db, 'userAnswers', `${examId}_${userId}`)
          const answeredExamRef = doc(db, 'users', userId, 'answeredExams', examId as string)

          const payload = {
            examId,
            userId,
            createdAt: Timestamp.now(),
            answers,
          }

          await Promise.all([
            setDoc(userAnswerRef, payload),
            setDoc(answeredExamRef, { answeredAt: Timestamp.now(), toUpdate: true })
          ])

          setSubmitted(true)
          toast.success('已提交')
          router.push(`/user/practice-list`)
        } catch (err) {
          console.error('提交作答失敗:', err)
          toast.error('提交失敗')
        }
      }


      toast.error('尚有未作答的題目，5 秒後將自動提交', {
        duration: 5000,
        action: {
          label: '確認',
          onClick: submit
        },
        cancel: {
          label: '取消',
          onClick: () => {
            clearTimeout(autoSubmitTimer)
            toast.success('❎ 已取消')
          }
        }
      })

      autoSubmitTimer = setTimeout(() => {
        submit()
      }, 5000)

      return // ❗ 中斷後續程式，避免跑到下面的 submit
    }

    // ✅ 全部作答時，立即提交
    forceSubmit()
  }

  useEffect(() => {
    if (!endTime) return

    const interval = setInterval(() => {
      const diff = Math.max(0, endTime.getTime() - Date.now())
      const m = Math.floor((diff / (1000 * 60)) % 60)
      const s = Math.floor((diff / 1000) % 60)
      setTimeLeft(`${m}分${s}秒`)

      if (diff === 0) {
        clearInterval(interval)
        forceSubmit() // 不提示，直接送
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [endTime, forceSubmit])

  const renderQuestion = (q: Question) => {
    if (q.type === 'ordering' && (!Array.isArray(answers[q.id]) || answers[q.id].length !== q.orderOptions.length)) {
      handleAnswer(q.id, q.orderOptions.map((_, idx) => idx))
    }
    if (q.type === 'matching' && !answers[q.id]) {
      handleAnswer(q.id, Array(q.left.length).fill(-1))
    }
    switch (q.type) {
      case 'single':
        return q.options.slice(0, 4).map((opt, i) => (
          <label key={i} className="block mt-4 font-medium">
            <input
              disabled={submitted || submitting}
              type="radio"
              name={q.id}
              checked={answers[q.id] === i}
              onChange={() => handleAnswer(q.id, i)}
              className="mr-2"
            />
            <span>({String.fromCharCode(65 + i)}) {renderContent(opt)}</span>
          </label>
        ))
      case 'multiple':
        return q.options.slice(0, 5).map((opt, i) => (
          <label key={i} className="block mt-4 font-medium">
            <input
              disabled={submitted || submitting}
              type="checkbox"
              checked={answers[q.id]?.includes(i)}
              onChange={(e) => {
                const prev: number[] = answers[q.id] || []
                if (e.target.checked) handleAnswer(q.id, [...prev, i])
                else handleAnswer(q.id, prev.filter((v) => v !== i))
              }}
              className="mr-2"
            />
            <span>({String.fromCharCode(65 + i)}) {renderContent(opt)}</span>
          </label>
        ))
      case 'truefalse':
        return (
          <div className="space-y-2 mt-2">
            {[true, false].map((val, idx) => (
              <label key={idx} className="block mt-4 font-medium">
                <input
                  disabled={submitted || submitting}
                  type="radio"
                  name={q.id}
                  checked={answers[q.id] === val}
                  onChange={() => handleAnswer(q.id, val)}
                  className="mr-2"
                />
                <span>{val ? '⭕️' : '❌'}</span>
              </label>
            ))}
          </div>
        )
      case 'ordering': {
        if (!initialized[q.id]) {
          let shuffled = q.orderOptions.map((_, i) => i)
          // 打亂直到不是正確答案順序（最多嘗試10次防止卡死）
          for (let i = 0; i < 10; i++) {
            shuffled = shuffled.sort(() => Math.random() - 0.5)
            const isSame = shuffled.every((val, idx) => val === q.answers[idx])
            if (!isSame) break
          }
          handleAnswer(q.id, shuffled)
          setInitialized(prev => ({ ...prev, [q.id]: true }))
        }

        const orderedIndexes = answers[q.id] ?? []

        return (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!over || active.id === over.id) return
              const oldIndex = orderedIndexes.indexOf(Number(active.id))
              const newIndex = orderedIndexes.indexOf(Number(over.id))
              const newOrder = arrayMove(orderedIndexes, oldIndex, newIndex)
              handleAnswer(q.id, newOrder)
              setInteracted(prev => ({...prev, [q.id]: true})) 
            }}
          >
            <SortableContext
              disabled={submitted || submitting}
              items={orderedIndexes.filter(i => typeof i === 'number').map(i => i.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 mt-4">
                {orderedIndexes.map((i) => (
                  <SortableItem key={i} id={i.toString()}>
                    <div className="w-full border rounded p-2 bg-white select-none">
                      {q.orderOptions[i]}
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )
      }



      case 'matching':
        return (
          <MatchingCanvas
            disabled={submitted || submitting}
            left={q.left}
            right={q.right}
            answers={answers[q.id]}
            onChange={userAnswer => handleAnswer(q.id, userAnswer)}
            readonly={true}
          />
        )
    }
  }

  if (checking) {
    return <div className="p-6 text-center text-gray-400">檢查中...</div>
  }

  return (
    <div className="min-h-screen w-full">
      <Toaster richColors position='bottom-right'/>
      <div className="max-w-5xl mx-auto space-y-6 pt-6 px-4">
        <h1 className="text-2xl font-bold">📝 開始作答</h1>
        {timeLeft && <div className="font-semibold">⏰ 剩餘時間：{timeLeft}</div>}
        <Progress value={progress} className="h-2 bg-white/20" />
        {questions.map((q, idx) => (
          <div key={q.id} className="p-4 border rounded-md space-y-2 shadow-sm">
            <div className="font-semibold">Q{idx + 1}：{renderContent(q.question)}</div>
            {renderQuestion(q)}
          </div>
        ))}
        <Button variant={`${submitted ? 'pending' : 'submit'}`} onClick={handleSubmit} disabled={submitted || submitting}>
          {submitted ? '提交中...' : '提交作答'}
        </Button>
        <div className="h-10" />
      </div>
    </div>
  )
}

