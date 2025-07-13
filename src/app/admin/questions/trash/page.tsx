'use client'

import { useEffect, useState, useCallback } from 'react'
import { db } from '@/lib/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy
} from 'firebase/firestore'
import { Button } from '@/components/button'
import { Toaster, toast } from 'sonner'
import { Question, renderContent, renderOptions } from '@/types/question'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/accordion'
import { Avatar, AvatarImage } from '@/components/avatar'

export default function TrashPage() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDeletedQuestions = useCallback(async () => {
    setLoading(true)
    const qSnap = await getDocs(query(
      collection(db, 'questions'),
      orderBy('createdAt', 'desc'),
      where('deleted', '==', true)
    ))
    const data = qSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Question))
    setQuestions(data)
    setLoading(false)
  }, [])


  useEffect(() => {
    fetchDeletedQuestions()
  }, [fetchDeletedQuestions])

  const handleRestore = async (id: string) => {
    try {
      await updateDoc(doc(db, 'questions', id), {
        deleted: false,
        updatedAt: serverTimestamp()
      })
      setQuestions(prev => prev.filter(q => q.id !== id))
      toast.success('已還原題目')
    } catch (err) {
      console.error(err)
      toast.error('還原失敗')
    }
  }

  const handlePermanentDelete = async (id: string) => {
    toast.warning('確定要永久刪除嗎？', {
      duration: 5000,
      description: '此操作無法復原',
      action: {
        label: '永久刪除',
        onClick: async () => {
          try {
            await deleteDoc(doc(db, 'questions', id))
            setQuestions(prev => prev.filter(q => q.id !== id))
            toast.success('已永久刪除題目')
            fetchDeletedQuestions()
          } catch (err) {
            console.error(err)
            toast.error('永久刪除失敗')
          }
        }
      }
    })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Toaster richColors closeButton position="bottom-right" />
      <h1 className="text-2xl font-bold">🗑️ 題目垃圾桶</h1>

      {loading ? (
        <p className="text-gray-400 text-center">載入中...</p>
      ) : questions.length === 0 ? (
        <div className="text-center">暫無題目</div>
      ) : (
        <div>
          {questions.map(q => (
             <div
              key={q.id}
              className="border border-gray-300 bg-zinc-200/20 rounded-2xl p-5 mb-5 shadow-md space-y-4 transition"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">
                  {renderContent(q.question)}
                </span>
                <div className="inline-flex justify-center gap-2">
                  <Button variant="undo" onClick={() => handleRestore(q.id)}>還原</Button>
                  <Button variant="delete" onClick={() => handlePermanentDelete(q.id)}>永久刪除</Button>
                </div>
              </div>
              {q.photoUrl !== '' && (
                <div className="flex justify-center items-center">
                  <Avatar className="rounded-md">
                    <AvatarImage src={q.photoUrl} />
                  </Avatar>
                </div>
              )}
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
        </div>
      )}
    </div>
  )
}

