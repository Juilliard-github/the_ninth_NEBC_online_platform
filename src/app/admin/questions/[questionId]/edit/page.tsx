'use client'
import EditSquareIcon from '@mui/icons-material/EditSquare';
import SaveIcon from '@mui/icons-material/Save';
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { Question, renderContent } from '@/types/question'
import { groupTypeLabels, questionTypeLabels } from '@/components/labels'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import SortableItem from '@/components/SortableItem_template'
import { Button } from '@/components/button'
import { toast } from 'sonner'
import MatchingCanvas from '@/components/MatchingCanvas'
import { Input } from '@/components/input'

export default function EditQuestionPage() {
  const generateId = () => Math.random().toString(36).substring(2, 8)
  const { questionId } = useParams<{ questionId: string }>()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [groupType, setGroupType] = useState<Question['groupType']>('highschool')
  const [type, setType] = useState<Question['type']>('single')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', '', '', '', ''])
  const [orderOptions, setOrderOptions] = useState(['第一項', '第二項', '第三項', '第四項'].map((text, i) => ({id: generateId(),text})))
  const [singleAnswer, setSingleAnswer] = useState<number | undefined>(undefined)
  const [multipleAnswer, setMultipleAnswer] = useState<number[]>([])
  const [trueFalseAnswer, setTrueFalseAnswer] = useState<boolean | undefined>(undefined)
  const [matchingLeft, setMatchingLeft] = useState<string[]>([])
  const [matchingRight, setMatchingRight] = useState<string[]>([])
  const [matchingAnswer, setMatchingAnswer] = useState<number[]>([])
  const [explanation, setExplanation] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string>('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const sensors = useSensors(useSensor(PointerSensor))

  useEffect(() => {
    if (!questionId) return
    getDoc(doc(db, 'questions', questionId))
      .then(snap => {
        if (!snap.exists()) throw new Error('題目不存在')
        const data = snap.data() as Question

        setGroupType(data.groupType)
        setType(data.type)
        setQuestion(data.question)
        setExplanation(data.explanation ?? '')
        setPhotoUrl(data.photoUrl)

        if (data.type === 'single') {
          setOptions(data.options || [])
          setSingleAnswer(data.answers as number)
        } else if (data.type === 'multiple') {
          setOptions(data.options || [])
          setMultipleAnswer(data.answers as number[])
        } else if (data.type === 'truefalse') {
          setTrueFalseAnswer(data.answers as boolean)
        } else if (data.type === 'ordering') {
          setOrderOptions(
            data.orderOptions.map((text, i) => ({
              id: generateId(),
              text,
            })))
        } else if (data.type === 'matching') {
          setMatchingLeft(data.left || [])
          setMatchingRight(data.right || [])
          setMatchingAnswer(data.answers as number[])
        }

        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setError('載入失敗')
        setLoading(false)
      })
  }, [questionId])

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
    if (!question.trim()) {
      toast.error('題目內容不可為空')
      return
    }

    let payload: Partial<Question> = {
      groupType,
      type,
      photoUrl,
      question,
      explanation,
      updatedAt: serverTimestamp(),
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
      payload.answers = singleAnswer as number
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
      payload.answers = multipleAnswer as number[]
    } else if (type === 'truefalse') {
      if (trueFalseAnswer === null) {
        toast.error('請選擇答案')
        return
      }
      payload.options = ['⭕️', '❌']
      payload.answers = trueFalseAnswer as boolean
    } else if (type === 'matching') {
      if (matchingAnswer.includes(-1) || matchingLeft.some(left => !left.trim()) || matchingRight.some(right => !right.trim())) {
        toast.error('請完成所有配對')
        return
      }
      payload.left = matchingLeft
      payload.right = matchingRight
      payload.answers = matchingAnswer as number[]
    } else if (type === 'ordering') {
      if (orderOptions.some(opt => !opt.text.trim())) {
        toast.error('選項不可為空')
        return
      }
      payload.orderOptions = orderOptions.map(opt => opt.text)
      payload.answers = orderOptions.map((_, i) => i) as number[]
    }

    try {
      await updateDoc(doc(db, 'questions', questionId!), payload)
      toast.success('更新成功')
      sessionStorage.setItem('questionListGroupType', groupType)
      router.push('/admin/questions/list') // 更新成功後跳轉
    } catch (err) {
      console.error(err)
      toast.error('更新失敗')
    }
  }

  const toggleAnswer = (idx: number) => {
    if (type === 'single') setSingleAnswer(idx)
    else if (type === 'multiple') {
      setMultipleAnswer(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
    } else if (type === 'truefalse') setTrueFalseAnswer(idx === 0)
  }

  if (error) return <p className="p-5 text-red-600 text-center">{error}</p>

  return (
    <main>
      <h1><EditSquareIcon/> 編輯題目</h1>
      <label>題組包類型</label>
      <select value={groupType} onChange={e => setGroupType(e.target.value as Question['groupType'])} className="mb-4 w-full border p-2 border-gray-300 rounded-xl bg-zinc-200/20">
        {Object.entries(groupTypeLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>

      <label>題目類型</label>
      <select value={type} onChange={e => setType(e.target.value as Question['type'])} className="mb-4 w-full border p-2 border-gray-300 rounded-xl bg-zinc-200/20">
        {Object.entries(questionTypeLabels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
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

      <label>題目內容</label>
      <textarea value={question} onChange={e => setQuestion(e.target.value)} className="w-full border p-2 rounded mb-2 bg-zinc-200/20" rows={4}/>
      {question && (<div className="text-lg border p-2 rounded bg-zinc-200/20 whitespace-pre-wrap break-words break-all hyphens-auto">{renderContent(question)}</div>)}

      {(type === 'single' || type === 'multiple') && (
        <>
          <label className="mt-4">選項</label>
          {options.slice(0, type === 'single' ? 4 : 5).map((opt, i) => (
            <div key={i} className="flex items-center gap-2 my-1 bg-zinc-200/20">
              <input type={type === 'single' ? 'radio' : 'checkbox'}
                checked={type === 'single' ? singleAnswer === i : multipleAnswer.includes(i)}
                onChange={() => toggleAnswer(i)}
              />
              <span>({String.fromCharCode(65 + i)})</span>
              <input
                value={opt}
                onChange={e => {
                  const arr = [...options]
                  arr[i] = e.target.value
                  setOptions(arr)
                }}
                className="flex-1 border p-2 rounded bg-zinc-200/20"
              />
            </div>
          ))}
        </>
      )}

      {type === 'truefalse' && (
        <div className="flex gap-4 mt-2">
          {[true, false].map((v, i) => (
            <label key={i} className="flex items-center gap-2 bg-zinc-200/20">
              <input type="radio" checked={trueFalseAnswer === v} onChange={() => setTrueFalseAnswer(v)} />
              <span>{v ? '⭕️' : '❌'}</span>
            </label>
          ))}
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
              <div className="space-y-2">
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

      {type === 'matching' && (
        <div className="mt-4 bg-zinc-200/20">
          <MatchingCanvas
            left={matchingLeft}
            right={matchingRight}
            answers={matchingAnswer}
            onChange={newAnswer => setMatchingAnswer(newAnswer)}
            onEdit={(newLeft, newRight) => {
              setMatchingLeft(newLeft)
              setMatchingRight(newRight)
            }}
            readonly={false}
          />
        </div>
      )}

      <label className="font-medium mt-4 mb-2">詳解</label>
      <textarea value={explanation} onChange={e => setExplanation(e.target.value)} className="w-full border p-2 rounded mb-2 bg-zinc-200/20" rows={4}/>
      {explanation && (<div className="border p-2 bg-gray-50 rounded bg-zinc-200/20  whitespace-pre-wrap break-words break-all hyphens-auto">{renderContent(explanation)}</div>)}

      <Button variant="submit" onClick={handleSave}><SaveIcon/> 儲存更新</Button>
    </main>
  )
}
