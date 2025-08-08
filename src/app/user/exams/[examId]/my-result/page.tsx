'use client'
import CloseIcon from '@mui/icons-material/Close';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { db } from '@/lib/firebase'
import { doc, getDoc, getDocs, collection, setDoc, serverTimestamp} from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { Question, renderContent, renderFeedback, isUnanswered, isAnswerCorrect } from '@/types/question'
import { Button } from '@/components/button'
import { toast } from 'sonner'
import { renderOptions } from '../../../../../types/question'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/accordion'

export default function MyResultPage() {
  const { examId } = useParams()
  const [userAnswers, setUserAnswers] = useState<any>()
  const [questions, setQuestions] = useState<Record<string, Question>>({})
  const [exam, setExam] = useState<any>(null)
  const [scoreMap, setScoreMap] = useState<Record<string, number>>({})
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [now, setNow] = useState(new Date())
  const [results, setResults] = useState<any[]>([]) // 你可以根據你的資料結構調整類型
  const [correctCount, setCorrectCount] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const auth = getAuth()
  const user = auth.currentUser

  useEffect(() => {
    const loadData = async () => {
      if (!examId || !user) return

      try {
        const uaId = `${examId}_${user.uid}`
        const uaRef = doc(db, 'userAnswers', uaId)
        const uaSnap = await getDoc(uaRef)
        if (!uaSnap.exists()) {
          return
        }
        setUserAnswers(uaSnap.data())
        const userAnswers = uaSnap.data();
        const examSnap = await getDoc(doc(db, 'exams', examId as string))
        const exam = examSnap.data()
        if (!exam) return
        setExam(exam)

        const scoreMap: Record<string, number> = {}
        exam.questionIds?.forEach(({ questionId, score }: any) => {
          scoreMap[questionId] = score
        })
        setScoreMap(scoreMap)

        const qSnap = await getDocs(collection(db, 'questions'))
        const questionMap: Record<string, Question> = {}
        qSnap.docs.forEach(doc => {
          questionMap[doc.id] = { id: doc.id, ...doc.data() } as Question
        })
        setQuestions(questionMap)

        const favSnap = await getDocs(collection(db, 'users', user.uid, 'favorites'))
        const favIds = new Set<string>()
        favSnap.forEach(doc => {
          const data = doc.data()
          if (!data.deleted) {
            favIds.add(doc.id)
          }
        })
        setFavoriteIds(favIds)


        if(!uaSnap.data()?.toUpdate) {
          setResults(uaSnap.data().results)
          setCorrectCount(uaSnap.data().correctCount)
          setTotalScore(uaSnap.data().totalScore)
          setTotalQuestions(uaSnap.data().totalQuestions)
        }
        // 更新成绩部分
        const results = exam.questionIds.map(({ questionId }) => {
          const q = questionMap[questionId]
          const ans = userAnswers.answers[questionId]
          const correct = q && isAnswerCorrect(q, ans)
          const score = correct ? (scoreMap[questionId] ?? 0) : 0
          return { questionId, correct, score, answer: ans, question: q }
        })

        const correctCount = results.filter(r => r.correct).length
        const totalScore = results.reduce((sum, r) => sum + r.score, 0)
        const totalQuestions = results.length

        setResults(results)
        setCorrectCount(correctCount)
        setTotalScore(totalScore)
        setTotalQuestions(totalQuestions)

       const userRef = doc(db, 'users', user.uid)
       const userDoc = await getDoc(userRef)
       if (!userDoc.exists()) return

        const payload = {
          updatedAt: serverTimestamp(),
          totalScore,
          correctCount,
          totalQuestions,
          toUpdate: false
        }

        const userPayload = {
          updatedAt: serverTimestamp(),
          totalScore: userDoc.data().totalScore + totalScore,
          correctCount: userDoc.data().correctCount + correctCount,
          totalQuestions: userDoc.data().totalQuestions + totalQuestions,
          toUpdate: false
        }

        await setDoc(uaRef, payload, {merge: true})
        await setDoc(userRef, userPayload, {merge: true})
      } catch (err) {
        console.error('更新成績失敗:', err)
      }
    }

    loadData()
  }, [examId, user]) // 确保在 `examId` 和 `user` 变动时重新加载数据


  const handleToggleFavorite = async (questionId: string) => {
    if (!user) {
      toast.error('請先登入才能收藏題目')
      return
    }

    const favRef = doc(db, 'users', user.uid, 'favorites', questionId)
    const isNowFavorite = favoriteIds.has(questionId)

    try {
      if (isNowFavorite) {
        await setDoc(favRef, { deleted: true }, { merge: true })
        setFavoriteIds(prev => {
          const newSet = new Set(prev)
          newSet.delete(questionId)
          return newSet
        })
        toast.success('已取消收藏')
      } else {
        await setDoc(favRef, { deleted: false }, { merge: true })
        setFavoriteIds(prev => {
          const newSet = new Set(prev)
          newSet.add(questionId)
          return newSet
        })
        toast.success('已收藏題目')
      }
    } catch (err) {
      console.error('收藏更新失敗', err)
      toast.error('收藏操作失敗')
    }
  }


  if (!exam) return <p className="p-5 text-center">找不到此考試</p> 
  if (!userAnswers || !userAnswers.answers) return <p className="p-5 text-center">查無作答資料</p>
  if((exam.answerAvailableAt && now <= exam.answerAvailableAt.toDate())) return <p className="p-5 text-center">解答尚未公布</p>

  return (
    <main>
      <h1><QueryStatsIcon/> 我的作答結果</h1>
      {exam.groupType !== 'highschool' && (
        <h2 className="text-xl font-semibold">總得分：{totalScore}</h2>
      )}
      <h2 className="text-xl font-semibold">正確題數：{correctCount} / {totalQuestions}</h2>

      {results.map(({ questionId, correct, score, answer, question }, index) => {
        if (!question) return null
        const isFavorite = favoriteIds.has(questionId)
        const unAnswered = isUnanswered(question, answer) && question.type !== 'ordering'
        return (
          <div
            key={questionId}
            className={`border p-4 rounded shadow ${
              unAnswered 
                ? 'bg-yellow-50/20 border-yellow-500/50'
                : correct
                ? 'bg-green-50/20 border-green-500/50'
                : 'bg-red-50/20 border-red-500/50'
            }`}
          >
            <div className="flex justify-between items-center">
              <div className="text-xl font-semibold mb-2">{renderContent(question.question)}</div>
              <Button variant={`${isFavorite ? 'default' : 'undo'}`} onClick={() => handleToggleFavorite(question.id)}>
                {isFavorite ? <><CloseIcon/> 取消收藏</> : <><BookmarksIcon/> 收藏題目</>}
              </Button>
            </div>
            <div
              className={`font-semibold mb-2 ${
                unAnswered 
                  ? 'text-yellow-500'
                  : correct
                  ? 'text-green-500'
                  : 'text-red-500'
              }`}
            >
              {unAnswered
                ? '⚠ 未作答'
                : correct && question.groupType === 'highschool'
                ? `✔ 答對！`
                : correct
                ? `✔ 答對！得分：${score}`
                : question.groupType === 'highschool'
                ? `✘ 答錯`
                : `✘ 答錯，得分：0`
              }
            </div>
            {unAnswered  && renderOptions(question)}
            {!unAnswered  && renderFeedback(question, answer)}
            <Accordion type="single" collapsible className="mt-2 text-lg text-gray-400">
              <AccordionItem value="explanation">
                <AccordionTrigger><MenuBookIcon/> 查看詳解</AccordionTrigger>
                <AccordionContent>
                  {question.explanation ? renderContent(question.explanation) : '（無詳解）'}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        )
      })}
    </main>
  )
}
