'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { db, auth } from '@/lib/firebase'
import {
  doc, getDoc, setDoc, collection, getDocs
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { Question, isUnanswered , renderContent, shuffleWithAnswerSync } from '@/types/question'
import { Button } from '@/components/button'
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
import { useUser } from '@/hooks/useUser'

export default function FavoritePracticePage() {
  const router = useRouter()
  const [userId, setUserId] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [progress, setProgress] = useState(0)
  const [submitted, setSubmitted] = useState(false)
  const [initialized, setInitialized] = useState<Record<string, boolean>>({})
  const sensors = useSensors(useSensor(PointerSensor))
  const [interacted, setInteracted] = useState<Record<string, boolean>>({})
  const { user } = useUser()
  
  useEffect(() => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) return
      setUserId(user.uid)

      // 取得收藏清單
      const favRef = collection(db, 'users', user.uid, 'favorites')
      const favSnap = await getDocs(favRef)

      const activeIds = favSnap.docs
        .filter(doc => !doc.data().deleted)
        .map(doc => doc.id)

      // 取得每題的詳細內容
      const questionDocs = await Promise.all(
        activeIds.map(id => getDoc(doc(db, 'questions', id)))
      )

      const loadedQuestions = questionDocs
        .filter(doc => doc.exists())
        .map(doc => ({ id: doc.id, ...doc.data() } as Question))
      

      // ✅ 對 ordering 題進行亂數打亂處理
      const processed = loadedQuestions.map(q => {
        if (q.type === 'ordering') {
          const { shuffled, answers } = shuffleWithAnswerSync(q.orderOptions)
          return {
            ...q,
            orderOptions: shuffled,
            answers,
          }
        }
        return q
      })

      // 設定狀態
      setQuestions(processed)
    })
  }, [])

  useEffect(() => {
    const answeredCount = questions.filter(q => !isUnanswered(q, answers[q.id], interacted)).length
    const total = questions.length
    setProgress((answeredCount / total) * 100)
  }, [answers, questions])


  const handleAnswer = (qid: string, value: any) => {
    setAnswers(prev => ({ ...prev, [qid]: value }))
  }


  const handleSubmit = async () => {
    if (submitted || !user) return
    const unanswered = questions.filter(q => isUnanswered(q, answers[q.id], interacted))


    const submit = async () => {
      setSubmitted(true)
      try {
        await setDoc(doc(db, 'users', user.uid, 'favoritePractice', 'lastAttempt'), {
          userId: user.uid,
          answers,
          createdAt: serverTimestamp(),
          questionIds: questions.map(q => q.id),
        })
        toast.success('已提交')
        router.push('/user/favorites/result')
      } catch (err) {
        console.error('提交作答失敗:', err)
        toast.error('提交失敗')
      }
    }

    if (unanswered.length > 0) {
      let autoSubmitTimer: NodeJS.Timeout

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
            toast.success('已取消')
          }
        }
      })

      autoSubmitTimer = setTimeout(() => {
        submit()
      }, 5000)
    } else {
      await submit()
    }
  }


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
              disabled={submitted}
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
              disabled={submitted}
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
                  disabled={submitted}
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
      case 'ordering':
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

        const order = answers[q.id] ?? []

        return (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!over || active.id === over.id) return
              const oldIndex = order.indexOf(Number(active.id))
              const newIndex = order.indexOf(Number(over.id))
              const newOrder = arrayMove(order, oldIndex, newIndex)
              handleAnswer(q.id, newOrder as number[])
              setInteracted(prev => ({...prev, [q.id]: true})) 
            }}
          >
            <SortableContext
              disabled={submitted}
              items={order.map(i => i.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 mt-4">
                {order.map((i) => (
                  <SortableItem key={i} id={i.toString()}>
                    <div
                      className="w-full border rounded p-2 bg-white select-none"
                    >
                      {q.orderOptions[i]}
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )

      case 'matching':
        return (
          <MatchingCanvas
            disabled={submitted}
            left={q.left}
            right={q.right}
            answers={answers[q.id]}
            onChange={userAnswer => handleAnswer(q.id, userAnswer)}
            readonly={true}
          />
        )
    }
  }

  return (
    <div className="min-h-screen w-full">
      <Toaster richColors position='bottom-right'/>
      <div className="max-w-5xl mx-auto space-y-5 pt-6 px-4">
        <h1 className="text-2xl font-bold">⭐ 錯題練習</h1>
        <Progress value={progress} className="h-2 bg-white/20" />
        {questions.map((q, idx) => (
          <div key={q.id} className="p-4 border rounded-md space-y-2 shadow-sm">
            <div className="text-xl font-semibold">Q{idx + 1}：{renderContent(q.question)}</div>
            {renderQuestion(q)}
          </div>
        ))}
        <Button variant={`${submitted ? 'pending' : 'submit'}`} onClick={handleSubmit} disabled={submitted}>
          {submitted ? '提交中...' : '提交作答'}
        </Button>
        <div className="h-10" />
      </div>
    </div>
  )
}

