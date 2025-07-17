import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';
import Link from 'next/link'
import { Timestamp } from 'firebase/firestore';

export interface QuestionBase {
  id: string
  question: string
  photoUrl: string
  groupType: 'highschool' | 'prep' | 'review'
  explanation?: string
  createdAt: Timestamp
  updatedAt?: Timestamp
  deleted: boolean
}

export interface ChoiceQuestion extends QuestionBase {
  type: 'single' | 'multiple' | 'truefalse'
  options: string[]
  answers: number | number[] | boolean
}
export interface MatchingQuestion extends QuestionBase {
  type: 'matching'
  left: string[]
  right: string[]
  answers: number[] // index of right matched to left[i]
 }
export interface OrderingQuestion extends QuestionBase {
  type: 'ordering'
  orderOptions: string[]
  answers: number[]  // e.g. [2, 0, 1]
 }
export type Question = ChoiceQuestion | MatchingQuestion | OrderingQuestion

export const isAnswerCorrect = (q: Question, userAns: any) => {
  if (q.type === 'single' || q.type === 'truefalse') return userAns === q.answers
  if (q.type === 'multiple')
    return Array.isArray(userAns) &&
      Array.isArray(q.answers) &&
      userAns.slice().sort().join(',') === q.answers.slice().sort().join(',')
  return JSON.stringify(userAns) === JSON.stringify(q.answers)
}

export function shuffleWithAnswerSync(orderOptions: string[]): { shuffled: string[], answers: number[] } {
  const original = orderOptions.map((opt, idx) => ({ opt, idx }))
  const shuffled = [...original].sort(() => Math.random() - 0.5)
  return {
    shuffled: shuffled.map(x => x.opt),
    answers: shuffled.map(x => x.idx),
  }
}

export function isUnanswered(q: Question, ans: any, interacted?: Record<string, boolean>): boolean {
  if (ans === undefined || ans === null) return true

  switch (q.type) {
    case 'single':
    case 'truefalse':
      return ans === '' || ans === null

    case 'multiple':
      return !Array.isArray(ans) || ans.length === 0

    case 'ordering':
       return !interacted?.[q.id] 

    case 'matching':
      return (
        !Array.isArray(ans) ||
        ans.length !== q.answers.length || // 防止長度不對
        ans.some((val: number) => val === -1)
      )

    default:
      return false
  }
}

export function renderContent(text: any) {
  const safeText = typeof text === 'string' ? text : String(text ?? '')
  const parts = safeText.split(/(\$\$.*?\$\$|\$.*?\$)/g)
  return parts.map((part, index) => {
    if (part.startsWith('$$') && part.endsWith('$$')) {
      return <BlockMath key={index}>{part.slice(2, -2)}</BlockMath>
    } if (part.startsWith('$') && part.endsWith('$')) {
      return <InlineMath key={index}>{part.slice(1, -1)}</InlineMath>
    } if (/.(jpg|jpeg|png|gif|svg|webp)$/.test(part.trim())) {
      return (
        <img
          key={index}
          src={part.trim()}
          alt="Image"
          className="max-h-40 my-2"
        />
      )
    } if (part.startsWith('http') && part.includes('://')) {
      return (
        <Link
          key={index}
          href={part.trim()}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          {part.trim()}
        </Link>
      )
    }
    return <span key={index}>{part}</span>
  })
}

const getOptionLabel = (i: number) => `(${String.fromCharCode(65 + i)})`

export function renderOptions(q: Question) {
  if (q.type === 'single' && Array.isArray(q.options)) {
    return (
      <ul className="mt-2">
        {q.options?.slice(0, 4).map((opt, i) => {
          return (
            <li key={i} className={`${q.answers === i ? 'text-green-500' : ''}`}>
              <span>{getOptionLabel(i)} {renderContent(opt)}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  if (q.type === 'multiple' && Array.isArray(q.options) && Array.isArray(q.answers)) {
    return (
      <ul className="mt-2">
        {q.options.map((opt, i) => {
          const isCorrect = q.answers.includes(i)
          return (
            <li key={i} className={`${isCorrect ? 'text-green-500' : ''}`}>
              <span>{getOptionLabel(i)} {renderContent(opt)}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  if (q.type === 'truefalse') {
    const tfOptions = ['◯', '✕']
    const correctIndex = q.answers === 0 || q.answers === true ? 0 : 1
    return (
      <ul className="mt-2">
        {tfOptions.map((opt, i) => {
          return (
            <li key={i} className={`${i === correctIndex ? 'text-green-500' : ''}`}>
              <span>{opt}</span>
            </li>
          )
        })}
      </ul>
    )
  }

  if (q.type === 'ordering' && Array.isArray(q.orderOptions)) {
    return (
      <>
        <div className='mb-2'>✅ 正確答案：</div>
        <ol className="list-decimal ml-5 mt-1">
          {q.orderOptions.map((idx: string, i: number) => (
            <li key={i}>{renderContent(idx)}</li>
          ))}
        </ol>
      </>
    )
  }

  if (q.type === 'matching' && Array.isArray(q.left) && Array.isArray(q.right) && Array.isArray(q.answers)) {
    return (
      <>
        <div className='mb-2'>✅ 正確答案：</div>
        <ul>
          {q.left.map((l, i) => (
            <li key={i}>{l} ➡️ {q.right[i]}</li>
          ))}
        </ul>
      </>
    )
  }
  return null
}

export function renderFeedback(q: Question, userAns: any){
  if (q.type === 'single' && Array.isArray(q.options)) {
    return (
      <ul className="mt-2 space-y-1">
        {q.options?.slice(0, 4).map((opt, i) => {
          const isCorrect = q.answers === i
          const userSelected = userAns === i
          let style = ''
          if (isCorrect) style = 'text-green-500'
          if (userSelected && !isCorrect) style = 'text-red-500'
          return (
            <li key={i} className={`p-1 rounded flex justify-between items-start ${style}`}>
              <span>{getOptionLabel(i)} {renderContent(opt)}</span>
              <span className="text-gray-400">
                {isCorrect && userSelected
                  ? '✔ 正確答案'
                  : isCorrect
                    ? '正確答案'
                    : userSelected
                      ? '您的作答'
                      : ''}
              </span>
            </li>
          )
        })}
      </ul>
    )
  }

  if (q.type === 'multiple' && Array.isArray(q.options) && Array.isArray(q.answers) && Array.isArray(userAns)) {
    return (
      <ul className="mt-2 space-y-1">
        {q.options?.map((opt, i) => {
          const isCorrect = Array.isArray(q.answers) && q.answers.includes(i)
          const userSelected = Array.isArray(userAns) && userAns.includes(i)
          let style = ''
          if (isCorrect) style = 'text-green-500'
          if (userSelected && !isCorrect) style = 'text-red-500'
          return (
            <li key={i} className={`flex justify-between items-center p-1 rounded ${style}`}>
              <span>({String.fromCharCode(65 + i)}) {renderContent(opt)}</span>
              <span className="text-gray-400">
                {isCorrect && userSelected
                  ? '✔ 正確答案'
                  : isCorrect
                    ? '正確答案'
                    : userSelected
                      ? '您的作答'
                      : ''}
              </span>
            </li>
          )
        })}
      </ul>
    )
  }
  if (q.type === 'truefalse') {
    return (
      <ul className="space-y-1">
        {[0, 1].map((val, i) => {
          const isCorrect = q.answers === val
          const isSelected = userAns === val
          let style = ''
          if (isCorrect) style = 'text-green-500'
          if (isSelected && !isCorrect) style = 'text-red-500'
          return (
            <li key={i} className={`flex justify-between items-center p-1 rounded ${style}`}>
              <span>{val ? '◯ 正確' : '✕ 錯誤'}</span>
              <span className="text-gray-400">
                {isCorrect && isSelected
                  ? '✔ 正確答案'
                  : isCorrect
                    ? '正確答案'
                    : isSelected
                      ? '您的作答'
                      : ''}
              </span>
            </li>
          )
        })}
      </ul>
    )
  }
  if (q.type === 'ordering' && Array.isArray(q.orderOptions) && Array.isArray(q.answers) && Array.isArray(userAns)) {
    const isCorrect = JSON.stringify(userAns) === JSON.stringify(q.orderOptions)
    return (
      <div className="space-y-1">
        {!isCorrect && (
          <>
            <div className="font-semibold">您的作答：</div>
            <ol className="list-decimal pl-6">
              {userAns.map((idx: string, i: number) => (
                <li key={i}>{renderContent(q.orderOptions[idx])}</li>
              ))}
            </ol>
          </>
        )}
        <div className="mt-2 space-y-3">
          {'✅ 正確答案：'}
          <ol className="list-decimal ml-5 mt-1">
            {q.orderOptions.map((idx: string, i: number) => (
              <li key={i}>{renderContent(idx)}</li>
            ))}
          </ol>
        </div>
      </div>
    )
  }
  if (q.type === 'matching' && Array.isArray(q.left) && Array.isArray(q.right) && Array.isArray(q.answers) && Array.isArray(userAns)) {
    const isCorrect = JSON.stringify(userAns) === JSON.stringify(q.answers)
    return (
      <div className="space-y-1">
        {!isCorrect && (
          <>
            <div className="font-semibold">您的作答：</div>
            {q.left.map((l, i) => (
              <li key={i}>{l} ➡️ {q.right[userAns[i]]}</li>
            ))}
          </>
        )}
        <>
          <div className="font-semibold mt-2">正確答案：</div>
          {q.left.map((l, i) => (
            <li key={i}>{l} ➡️ {q.right[q.answers[i]]}</li>
          ))}
        </>
      </div>
    )
  }
  return null
}

export function renderResults(
  q: Question,
  distribution: Record<string, number>,
  totalUsers: number
) {
  if (q.type === 'single' && Array.isArray(q.options)) {
    return (
      <ul className="mt-2 space-y-1">
        {q.options.slice(0, 4).map((opt, i) => {
          const count = distribution?.[i.toString()] || 0
          return (
            <li key={i} className={`flex justify-between ${q.answers === i ? 'text-green-500' : ''}`}>
              <span>{getOptionLabel(i)} {renderContent(opt)}</span>
              <span className="text-gray-400 whitespace-nowrap ml-4">
                {count} 人（{((count / totalUsers) * 100).toFixed(1)}%）
              </span>
            </li>
          )
        })}
      </ul>
    )
  }

  if (q.type === 'multiple' && Array.isArray(q.options) && Array.isArray(q.answers)) {
    return (
      <ul className="mt-2 space-y-1">
        {q.options.map((opt, i) => {
          const count = distribution?.[i.toString()] || 0
          const isCorrect = Array.isArray(q.answers) && q.answers.includes(i)
          console.log("distribution: ", distribution)
          return (
            <li key={i} className={`flex justify-between ${isCorrect ? 'text-green-500' : ''}`}>
              <span>{getOptionLabel(i)} {renderContent(opt)}</span>
              <span className="text-gray-400 whitespace-nowrap ml-4">
                {count} 人（{((count / totalUsers) * 100).toFixed(1)}%）
              </span>
            </li>
          )
      })}
    </ul>
    )
  }

  if (q.type === 'truefalse') {
    const tfOptions = ['⭕', '❌']
    const correctIndex = q.answers === 0 || q.answers === true ? 0 : 1
    return (
      <ul className="mt-2 space-y-1">
        {[true, false].map((val, i) => {
          const count = distribution?.[JSON.stringify(val)] || 0
          return (
            <li key={i} className={`flex justify-between ${i === correctIndex ? 'text-green-500' : ''}`}>
              <span>{tfOptions[i]}</span>
              <span className="text-gray-400 whitespace-nowrap ml-4">
                {count} 人（{((count / totalUsers) * 100).toFixed(1)}%）
              </span>
            </li>
          )
        })}
      </ul>
    )
  }

  if (q.type === 'ordering' && Array.isArray(q.answers) && Array.isArray(q.orderOptions)) {
    const correctKey = JSON.stringify(q.answers.map(Number))
    const items = Object.entries(distribution || {})
      .map(([k, v]) => ({
        key: k,
        value: JSON.parse(k).map(Number),
        count: v
      }))

    if (!items.some(i => i.key === correctKey)) {
      items.push({
        key: correctKey,
        value: q.answers.map(Number),
        count: 0
      })
    }

    const correctItem = items.find(i => i.key === correctKey)!
    const otherItems = items.filter(i => i.key !== correctKey).sort((a, b) => b.count - a.count)
    const sortedItems = [...otherItems, correctItem]

    return (
      <div className="mt-4 space-y-4">
        {sortedItems.map(({ key, value, count }) => {
          const isCorrect = key === correctKey
          return (
            <div key={key} className={`p-3 flex flex-col md:flex-row md:justify-between`}>
              <div>
                <span className={`font-semibold ${isCorrect ? 'text-green-500' : ''}`}>
                  {isCorrect ? '✅ 正確答案：' : '✍️ 使用者作答：'}
                </span>
                <ol className="list-decimal pl-5 mt-2 space-y-1">
                  {value.map((idx, i) => (
                    <li key={i}>{renderContent(q.orderOptions[idx])}</li>
                  ))}
                </ol>
              </div>
              <div className="mt-2 md:mt-0 md:ml-4 text-gray-400 whitespace-nowrap">
                （{count} 人，{((count / totalUsers) * 100).toFixed(1)}%）
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (q.type === 'matching' && Array.isArray(q.answers) && Array.isArray(q.left) && Array.isArray(q.right)) {
    const correctKey = JSON.stringify(q.answers)
    const items = Object.entries(distribution || {})
      .map(([k, v]) => ({
        key: k,
        value: JSON.parse(k),
        count: v
      }))
      .filter(({ value }) => !isUnanswered(q, value))

    if (!items.some(i => i.key === correctKey)) {
      items.push({ key: correctKey, value: q.answers, count: 0 })
    }

    const correctItem = items.find(i => i.key === correctKey)!
    const otherItems = items.filter(i => i.key !== correctKey).sort((a, b) => b.count - a.count)
    const sortedItems = [...otherItems, correctItem]

    return (
      <div className="mt-4 space-y-4">
        {sortedItems.map(({ key, value, count }) => {
          const isCorrect = key === correctKey
          return (
            <div key={key} className={`p-3 flex flex-col md:flex-row md:justify-between`}>
              <div>
                <span className={`font-semibold ${isCorrect ? 'text-green-500' : ''}`}>
                  {isCorrect ? '✅ 正確答案：' : '✍️ 使用者作答：'}
                </span>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  {q.left.map((l, i) => (
                    <li key={i}>{l} ➡️ {q.right[value[i]] ?? '❓'}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-2 md:mt-0 md:ml-4 text-gray-400 whitespace-nowrap">
                （{count} 人，{((count / totalUsers) * 100).toFixed(1)}%）
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return null
}
