'use client'

import { useState } from 'react'
import { Timestamp, addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useRouter } from 'next/navigation'
import { Question, QuestionBase } from '@/types/question'
import { groupTypeLabels, questionTypeLabels } from '@/components/labels'
import MatchingCanvas from '@/components/MatchingCanvas'
import { Button } from '@/components/button'
import { renderContent } from '@/types/question'
import SortableItem from '@/components/SortableItem_template'
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Toaster, toast } from 'sonner'

export default function NewQuestionPage() {
  const generateId = () => Math.random().toString(36).substring(2, 8)
  const router = useRouter()
  const sensors = useSensors(useSensor(PointerSensor))

  const [groupType, setGroupType] = useState<QuestionBase['groupType']>('highschool')
  const [type, setType] = useState<Question['type']>('single')
  const [question, setQuestion] = useState('')
  const [explanation, setExplanation] = useState('')

  const [singleAnswer, setSingleAnswer] = useState<number>(-1)
  const [multipleAnswer, setMultipleAnswer] = useState<number[]>([])
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<boolean | null>(null)

  const [matchingLeft, setMatchingLeft] = useState<string[]>(['a', 'b', 'c', 'd'])
  const [matchingRight, setMatchingRight] = useState<string[]>(['A', 'B', 'C', 'D'])
  const [matchingAnswer, setMatchingAnswer] = useState<number[]>([-1, -1, -1, -1])

  const [options, setOptions] = useState<string[]>(['', '', '', '', ''])
  const [orderOptions, setOrderOptions] = useState(['第一項', '第二項', '第三項', '第四項'].map((text, i) => ({id: generateId(),text})))

  const handleSave = async () => {
    const payload: Partial<Question> = {
      question,
      type,
      groupType,
      explanation,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      deleted: false,
    }

    if (type === 'single') {
      payload.options = options
      payload.answers = singleAnswer as number
    } else if (type === 'multiple') {
      payload.options = options
      payload.answers = multipleAnswer as number[]
    } else if (type === 'truefalse') {
      payload.options = ['⭕️', '❌']
      payload.answers = trueFalseAnswer as boolean
    } else if (type === 'matching') {
      if (matchingAnswer.includes(-1)) {
        toast.error('❗ 請完成所有配對')
        return
      }
      payload.left = matchingLeft
      payload.right = matchingRight
      payload.answers = matchingAnswer as number[]
    } else if (type === 'ordering') {
      payload.orderOptions = orderOptions.map(opt => opt.text)
      payload.answers = orderOptions.map((_, i) => i) as number[]
    }

    await addDoc(collection(db, 'questions'), payload)
    toast.success('✅ 題目已建立')
    sessionStorage.setItem('questionListGroupType', groupType)
    setTimeout(() => router.push('/admin/questions/list'), 1000)
  }

  const toggleAnswer = (index: number) => {
    if (type === 'single') {
      setSingleAnswer(index)
    } else if (type === 'multiple') {
      setMultipleAnswer((prev) =>
        prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]
      )
    } else if (type === 'truefalse') {
      setTrueFalseAnswer(index === 0)
    }
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">✏️ 建立新題目</h1>
      <Toaster richColors position="bottom-right" />

      <label className="block mb-2 font-medium">題組包類型</label>
      <select
        value={groupType}
        onChange={e => setGroupType(e.target.value as Question['groupType'])}
        className="mb-4 p-2 border rounded w-ful bg-zinc-200/10"
      >
        {Object.entries(groupTypeLabels).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      <label className="block mb-2 font-medium">題目類型</label>
      <select
        value={type}
        onChange={e => setType(e.target.value as Question['type'])}
        className="mb-4 p-2 border rounded w-full bg-zinc-200/10"
      >
        {Object.entries(questionTypeLabels).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      <label className="block mb-2 font-medium">題目內容</label>
      <textarea
        value={question}
        onChange={e => setQuestion(e.target.value)}
        className="w-full border rounded p-2 bg-zinc-200/10"
        rows={4}
      />
      <p className="block mt-4 font-medium">題目內容預覽</p>
      <div className="mt-2 border p-4 rounded bg-zinc-200/10">{renderContent(question)}</div>

      {(type === 'single' || type === 'multiple') && (
        <div>
          <label className="block mt-4 font-medium0">選項</label>
          {options.slice(0, type === 'single' ? 4 : 5).map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2 my-1 bg-zinc-200/10">
              <input
                type={type === 'single' ? 'radio' : 'checkbox'}
                name="answer"
                checked={
                  type === 'single'
                    ? singleAnswer === idx
                    : multipleAnswer.includes(idx)
                }
                onChange={() => toggleAnswer(idx)}
              />
              <span>({String.fromCharCode(65 + idx)})</span>
              <input
                value={opt}
                onChange={e => {
                  const newOptions = [...options]
                  newOptions[idx] = e.target.value
                  setOptions(newOptions)
                }}
                className="flex-1 border p-2 rounded bg-zinc-200/10"
              />
            </div>
          ))}
        </div>
      )}

      {type === 'truefalse' && (
        <div className="space-y-2 mt-2">
          {[true, false].map((val, idx) => (
            <label key={idx} className="flex items-center gap-2 bg-zinc-200/10">
              <input
                type="radio"
                name="truefalse"
                checked={trueFalseAnswer === val}
                onChange={() => setTrueFalseAnswer(val)}
              />
              <span>{val ? '⭕️' : '❌'}</span>
            </label>
          ))}
        </div>
      )}

      {type === 'matching' && (
        <div className="mt-6 bg-zinc-200/10">
          <MatchingCanvas
            left={matchingLeft}
            right={matchingRight}
            answers={matchingAnswer}
            onChange={setMatchingAnswer}
            onEdit={(newLeft, newRight) => {
              setMatchingLeft(newLeft)
              setMatchingRight(newRight)
            }}
            readonly={false}
          />
        </div>
      )}

      {type === 'ordering' && (
        <div className="mt-4 bg-zinc-200/10">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (!over || active.id === over.id) return
              const oldIndex = orderOptions.findIndex(item => item.id === active.id)
              const newIndex = orderOptions.findIndex(item => item.id === over.id)
              setOrderOptions(arrayMove(orderOptions, oldIndex, newIndex))
            }}
          >
            <SortableContext
              items={orderOptions.map(opt => opt.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2 bg-zinc-200/10">
                {orderOptions.map((opt, idx) => (
                  <SortableItem key={opt.id} id={opt.id}>
                    <input
                      value={opt.text}
                      onChange={(e) => {
                        const updated = [...orderOptions]
                        updated[idx] = { ...updated[idx], text: e.target.value }
                        setOrderOptions(updated)
                      }}
                      className="w-full border rounded p-2 bg-zinc-200/10"
                    />
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <label className="block mt-4 font-medium">詳解</label>
      <textarea
        value={explanation}
        onChange={e => setExplanation(e.target.value)}
        className="w-full border rounded p-2 bg-zinc-200/10"
        rows={4}
      />
      <p className="block mt-4 font-medium">詳解預覽：</p>
      <div className="mt-2 border p-4 rounded bg-zinc-200/10">{renderContent(explanation)}</div>

      <Button variant="create" onClick={handleSave} className="mt-4 bg-fuchsia-900 text-white px-3 py-1">建立題目 💾</Button>
    </main>
  )
}
