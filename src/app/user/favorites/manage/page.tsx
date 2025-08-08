'use client'
import LabelImportantIcon from '@mui/icons-material/LabelImportant';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import { useEffect, useState, useCallback } from 'react'
import {
  collection, getDocs, doc, getDoc, updateDoc, deleteDoc
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useUser } from '@/components/useUser'
import { Button } from '@/components/button'
import { Card } from '@/components/card'
import Link from 'next/link'
import { toast } from 'sonner'
import { Question, renderContent, renderOptions } from '@/types/question'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/accordion'

type FavoriteQuestion = Question & { isDeleted: boolean }

export default function FavoriteManagePage() {
  const user = useUser()
  const [favorites, setFavorites] = useState<FavoriteQuestion[]>([])

  const fetchFavorites = useCallback(async () => {
    if (!user) return
    const favCollectionRef = collection(db, 'users', user.uid, 'favorites')
    const favSnap = await getDocs(favCollectionRef)
    const favMetaList = favSnap.docs.map(doc => ({
      id: doc.id,
      deleted: doc.data().deleted ?? false,
    }))
    const questionSnaps = await Promise.all(
      favMetaList.map(fav => getDoc(doc(db, 'questions', fav.id)))
    )

    const combined: FavoriteQuestion[] = questionSnaps
      .map((snap, i) => {
        if (!snap.exists()) return null
        const data = snap.data() as Question
        return {
          ...data,
          id: snap.id,
          isDeleted: favMetaList[i].deleted,
        }
      })
      .filter(Boolean) as FavoriteQuestion[]

    setFavorites(combined)
  }, [user])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const toggleDelete = async (qid: string, current: boolean) => {
    if (!user) return
    const favDocRef = doc(db, 'users', user.uid, 'favorites', qid)
    await updateDoc(favDocRef, { deleted: !current })
    setFavorites(prev =>
      prev.map(q => q.id === qid ? { ...q, isDeleted: !current } : q)
    )
    toast.success(!current ? '已移至垃圾桶' : '已還原')
  }

  const permanentlyDelete = async (qid: string) => {
    if (!user) return
    const favDocRef = doc(db, 'users', user.uid, 'favorites', qid)
    await deleteDoc(favDocRef)
    setFavorites(prev => prev.filter(q => q.id !== qid))
    toast.success('已永久刪除題目')
  }

  const active = favorites.filter(q => !q.isDeleted)
  const trashed = favorites.filter(q => q.isDeleted)

  return (
    <main>
      <div className="flex justify-between items-center">
        <h1><BookmarksIcon/> 錯題收藏管理</h1>
        <Link href="/user/favorites/practice"><LabelImportantIcon/> 開始練習</Link>
      </div>

      <>
        {/* 收藏中區塊 */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">收藏中</h2>
          {active.length === 0 ? (
            <p className="text-gray-400">無資料</p>
          ) : (
            <div className="space-y-4">
              {active.map(q => (
                <Card key={q.id} className="p-4 space-y-2 bg-zinc-200/20">
                  <div className="text-xl font-semibold">{renderContent(q.question)}</div>
                  {renderOptions(q)}
                  <details className="mt-2 text-gray-400">
                    <summary className="cursor-pointer"><MenuBookIcon/> 查看詳解</summary>
                    <div className="mt-1">{q.explanation ? renderContent(q.explanation) : '（無詳解）'}</div>
                  </details>
                  <div className="pt-2">
                    <Button variant="delete" onClick={() => toggleDelete(q.id, false)}>移至垃圾桶</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">垃圾桶</h2>
          {trashed.length === 0 ? (
            <p className="text-gray-400">無資料</p>
          ) : (
            <div className="space-y-4">
              {trashed.map(q => (
              <div
                key={q.id}
                className="border border-gray-300 bg-zinc-200/20 rounded-2xl p-5 shadow-md space-y-4 transition"
              >
              <div className="flex justify-between items-center">
                <div className="inline-flex justify-center gap-2">
                    <Button variant="undo" onClick={() => toggleDelete(q.id, true)}>還原</Button>
                    <Button variant="delete" onClick={() => permanentlyDelete(q.id)}>永久刪除</Button>          </div>
              </div>

              <div className="text-xl font-semibold">
                {renderContent(q.question)}
              </div>
              {renderOptions(q)}

              <Accordion type="single" collapsible className="mt-2 text-gray-400">
                <AccordionItem value="explanation">
                  <AccordionTrigger><MenuBookIcon/> 查看詳解</AccordionTrigger>
                  <AccordionContent>
                    {q.explanation ? renderContent(q.explanation) : '（無詳解）'}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
            ))}
            </div>
          )}
        </section>
      </>
    </main>
  )
}