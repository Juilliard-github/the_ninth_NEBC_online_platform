'use client'
import AddBoxIcon from '@mui/icons-material/AddBox';
import { useState } from 'react'
import { serverTimestamp, addDoc, collection } from 'firebase/firestore'
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
import { toast } from 'sonner'
import { Input } from '@/components/input'

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
  
  const [photoUrl, setPhotoUrl] = useState<string>('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]    
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotoUrl(reader.result)
        }
      }
      reader.readAsDataURL(file)
    } else{
      setPhotoUrl('')
      setPhotoFile(null)
    }
  }
  

  const handleSave = async () => {
    try {
      if (!question.trim()) {
        toast.error('題目內容不可為空')
        return
      }

      const payload: Partial<Question> = {
        question,
        type,
        groupType,
        explanation,
        photoUrl,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        deleted: false,
      }

      if (type === 'single') {
        if (options.slice(0,4).some(opt => !opt.trim())) {
          toast.error('選項不可為空')
          return
        }
        if (singleAnswer === -1) {
          toast.error('請選擇答案')
          return
        }
        payload.options = options
        payload.answers = singleAnswer
      } else if (type === 'multiple') {
        if (options.some(opt => !opt.trim())) {
          toast.error('選項不可為空')
          return
        }
        if (multipleAnswer.length === 0) {
          toast.error('請選擇答案')
          return
        }
        payload.options = options
        payload.answers = multipleAnswer
      } else if (type === 'truefalse') {
        if (trueFalseAnswer === null) {
          toast.error('請選擇答案')
          return
        }
        payload.options = ['⭕️', '❌']
        payload.answers = trueFalseAnswer
      } else if (type === 'matching') {
        if (matchingAnswer.includes(-1) || matchingLeft.some(left => !left.trim()) || matchingRight.some(right => !right.trim())) {
          toast.error('請完成所有配對')
          return
        }
        payload.left = matchingLeft
        payload.right = matchingRight
        payload.answers = matchingAnswer
      } else if (type === 'ordering') {
        if (orderOptions.some(opt => !opt.text.trim())) {
          toast.error('選項不可為空')
          return
        }
        payload.orderOptions = orderOptions.map(opt => opt.text)
        payload.answers = orderOptions.map((_, i) => i)
      }

      await addDoc(collection(db, 'questions'), payload)
      toast.success('題目已建立')
      sessionStorage.setItem('questionListGroupType', groupType)
      setTimeout(() => router.push('/admin/questions/list'), 1000)
    } catch (err){
      console.error(err)
      toast.error('建立失敗，請稍後再試')
    }
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
    <main>
      <h1><AddBoxIcon/> 新增題目</h1>
      <label className="block mb-2 font-medium">題組包類型</label>
      <select
        value={groupType}
        onChange={e => setGroupType(e.target.value as Question['groupType'])}
        className="mb-4 p-2 border w-full bg-zinc-200/20 border-gray-300 rounded-xl"
      >
        {Object.entries(groupTypeLabels).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      <label className="block mb-2 font-medium">題目類型</label>
      <select
        value={type}
        onChange={e => setType(e.target.value as Question['type'])}
        className="mb-4 p-2 w-full bg-zinc-200/20 border border-gray-300 rounded-xl"
      >
        {Object.entries(questionTypeLabels).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      <label className="block mb-2 font-medium">題目圖片</label>
      <Input className="bg-zinc-200/20" type="file" accept="image/*" onChange={handlePhotoChange} />
      {photoUrl !== '' && (
        <div className="flex justify-center items-center">
          <img
            alt="題目圖片"
            className="rounded-md"
            src={photoUrl}
          />
        </div>
      )}

      <label className="block mb-2 font-medium">題目內容</label>
      <textarea
        value={question}
        onChange={e => setQuestion(e.target.value)}
        className="w-full border rounded p-2 bg-zinc-200/20"
        rows={4}
      />
      <p className="block mb-2 font-medium">題目內容預覽</p>
      {question && (<div className="border p-2 rounded bg-zinc-200/20 whitespace-pre-wrap break-words break-all hyphens-auto">{renderContent(question)}</div>)}

      {(type === 'single' || type === 'multiple') && (
        <div>
          <label className="block mt-4 font-medium0">選項</label>
          {options.slice(0, type === 'single' ? 4 : 5).map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2 my-1 bg-zinc-200/20">
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
                className="flex-1 border p-2 rounded bg-zinc-200/20"
              />
            </div>
          ))}
        </div>
      )}

      {type === 'truefalse' && (
        <div className="space-y-2 mt-2">
          {[true, false].map((val, idx) => (
            <label key={idx} className="flex items-center gap-2 bg-zinc-200/20">
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
        <div className="mt-6 bg-zinc-200/20">
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
        <div className="mt-4 bg-zinc-200/20">
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
              <div className="space-y-2 bg-zinc-200/20">
                {orderOptions.map((opt, idx) => (
                  <SortableItem key={opt.id} id={opt.id}>
                    <input
                      value={opt.text}
                      onChange={(e) => {
                        const updated = [...orderOptions]
                        updated[idx] = { ...updated[idx], text: e.target.value }
                        setOrderOptions(updated)
                      }}
                      className="w-full border rounded p-2 bg-zinc-200/20"
                    />
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      <label className="block mb-2 font-medium">詳解</label>
      <textarea
        value={explanation}
        onChange={e => setExplanation(e.target.value)}
        className="w-full border rounded p-2 bg-zinc-200/20"
        rows={4}
      />
      <p className="block mb-2 font-medium">詳解預覽：</p>
      {explanation && (<div className="border p-2 rounded bg-zinc-200/20 whitespace-pre-wrap break-words break-all hyphens-auto">{renderContent(explanation)}</div>)}

      <Button variant="create" onClick={handleSave}>建立題目 💾</Button>
    </main>
  )
}