'use client'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore'
import { Button } from '@/components/button'
import { useUser } from '@/hooks/useUser'
import { Question, renderContent, renderFeedback, renderOptions, isUnanswered, isAnswerCorrect } from '@/types/question'
import { questionTypeLabels } from '@/components/labels'
import { toast, Toaster } from 'sonner'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/accordion'

export default function FavoriteResultPage() {
  const { user } = useUser()
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [correctCount, setCorrectCount] = useState(0)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])


  useEffect(() => {
    const fetchResult = async () => {
      if (!user) return
      try {
        const resultSnap = await getDoc(doc(db, 'users', user.uid, 'favoritePractice', 'lastAttempt'))
        if (!resultSnap.exists()) {
          toast.warning('無資料')
          setLoading(false)
          return
        }


        const result = resultSnap.data()
        const answers = result.answers || {}
        const qids: string[] = result.questionIds || []


        const questionSnaps = await Promise.all(
          qids.map(id => getDoc(doc(db, 'questions', id)))
        )
        const loadedQuestions = questionSnaps
          .filter(q => q.exists())
          .map(q => ({ id: q.id, ...q.data() } as Question))


        const favColRef = collection(db, 'users', user.uid, 'favorites')
        const favDocsSnap = await getDocs(favColRef)

        const rawFavs = favDocsSnap.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as { deleted?: boolean })
        }))

        const activeFavIds = rawFavs.filter(f => !f.deleted).map(f => f.id)

        const correct = loadedQuestions.reduce((acc, q) => {
          const userAns = answers[q.id]
          return isAnswerCorrect(q, userAns) ? acc + 1 : acc
        }, 0)


        setQuestions(loadedQuestions)
        setAnswers(answers)
        setCorrectCount(correct)
        setFavoriteIds(activeFavIds)


        // ⬇️ 自動移除答對題目
        const correctIds = loadedQuestions
          .filter(q => isAnswerCorrect(q, answers[q.id]) && activeFavIds.includes(q.id))
          .map(q => q.id)


        if (correctIds.length > 0 && rawFavs.length > 0) {
          const updated = rawFavs.map((f: Question) =>
            correctIds.includes(f.id) ? { ...f, deleted: true } : f
          )
          for (const qid of correctIds) {
            await setDoc(
              doc(db, 'users', user.uid, 'favorites', qid),
              { deleted: true },
              { merge: true }
            )
          }
          setFavoriteIds(updated.filter((f: Question) => !f.deleted).map((f: Question) => f.id))
          toast.success('已自動移除作答正確的收藏題目')
        }


      } catch (err) {
        console.error('讀取錯誤練習結果失敗:', err)
        toast.error('載入錯誤，請稍後再試')
      } finally {
        setLoading(false)
      }
    }


    fetchResult()
  }, [user])

  const handleToggleFavorite = async (qid: string) => {
    if (!user) return

    const favRef = doc(db, 'users', user.uid, 'favorites', qid)
    const favSnap = await getDoc(favRef)
    let deleted = false

    if (favSnap.exists()) {
      const data = favSnap.data()
      deleted = !data.deleted
    }

    await setDoc(favRef, { deleted }, { merge: true })

    const updatedSnap = await getDocs(collection(db, 'users', user.uid, 'favorites'))
    const updatedActive = updatedSnap.docs
      .map(doc => ({ id: doc.id, ...(doc.data() as { deleted?: boolean }) }))
      .filter(f => !f.deleted)
      .map(f => f.id)

    setFavoriteIds(updatedActive)
    toast.success('已更新收藏狀態')
  }

  if (loading) return <p className="p-6">載入中...</p>
  if (questions.length === 0) return <p className="p-6">尚無錯題練習資料。</p>


  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <Toaster richColors position='bottom-right'/>
      <h1 className="text-2xl font-bold">📊 錯題練習結果</h1>
      <h2 className="text-xl font-semibold">正確題數：{correctCount} / {questions.length}</h2>


      {questions.map((question, index) => {
        const answer = answers[question.id]
        const correct = isAnswerCorrect(question, answer)
        const isFavorite = favoriteIds.includes(question.id)
        const unAnswered = isUnanswered(question, answer)
        return (
          <div
            key={question.id}
            className={`border p-4 rounded shadow ${
              unAnswered 
                ? 'bg-yellow-50/20 border-yellow-500/50'
                : correct
                ? 'bg-green-50/20 border-green-500/50'
                : 'bg-red-50/20 border-red-500/50'
            }`}
          >
            <div className="flex justify-between items-center">
              <h2 className="font-semibold">
                第 {index + 1} 題 - {questionTypeLabels[question.type]}
              </h2>
              <Button variant="default" size="sm" onClick={() => handleToggleFavorite(question.id)}>
                {isFavorite ? '❌ 取消收藏' : '⭐ 收藏題目'}
              </Button>
            </div>
            <div className="mb-2">{renderContent(question.question)}</div>
            <div
              className={`text-sm font-semibold mb-2 ${
                unAnswered 
                  ? 'text-yellow-500'
                  : correct
                  ? 'text-green-500'
                  : 'text-red-500'
              }`}
            >
              {unAnswered 
                ? '⚠ 未作答'
                : correct
                ? (`✔ 答對！得分：${score}`)
                : `✘ 答錯，得分：0`}
            </div>
            {unAnswered  && renderOptions(question)}
            {!unAnswered  && renderFeedback(question, answer)}
            <Accordion type="single" collapsible className="mt-2 text-gray-400">
              <AccordionItem value="explanation">
                <AccordionTrigger>📖 查看詳解</AccordionTrigger>
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

