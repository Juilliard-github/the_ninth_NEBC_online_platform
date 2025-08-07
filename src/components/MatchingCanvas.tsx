'use client'

import { useEffect, useRef, useState } from 'react'
import classNames from 'classnames'

export interface MatchingCanvasProps {
  left: string[]
  right: string[]
  answers: number[] // left[i] 對應到 right[answers[i]]
  onChange: (answers: number[]) => void
  onEdit?: (left: string[], right: string[]) => void
  readonly?: boolean
  disabled?: boolean
}

export default function MatchingCanvas({ left, right, answers, onChange, onEdit, readonly, disabled }: MatchingCanvasProps) {
  const [selected, setSelected] = useState<{ side: 'left' | 'right'; index: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const leftRefs = useRef<(HTMLDivElement | null)[]>([])
  const rightRefs = useRef<(HTMLDivElement | null)[]>([])
  const itemClass = readonly
  ? 'border p-2 rounded w-full select-none pointer-events-none'
  : 'border p-2 rounded w-full'

  const handleClick = (side: 'left' | 'right', index: number) => {
    if (!selected) {
      setSelected({ side, index })
      return
    }

    if (selected.side === side) {
      setSelected({ side, index }) // 點同側就改選
      return
    }

    const leftIndex = side === 'left' ? index : selected.index
    const rightIndex = side === 'right' ? index : selected.index

    const newAnswers = [...answers]

    // 移除任何原本指向該 right 的 left（保持 right 唯一）
    for (let i = 0; i < newAnswers.length; i++) {
      if (newAnswers[i] === rightIndex) newAnswers[i] = -1
    }

    newAnswers[leftIndex] = rightIndex
    onChange(newAnswers)
    setSelected(null)
  }

  const getLinePositions = () => {
    if (!containerRef.current) return []
    const containerRect = containerRef.current.getBoundingClientRect()

    return answers.map((rIdx, i) => {
      if (rIdx === -1 || rIdx < 0 || rIdx >= right.length) return null

      const leftEl = leftRefs.current[i]
      const rightEl = rightRefs.current[rIdx]
      if (!leftEl || !rightEl) return null

      const leftRect = leftEl.getBoundingClientRect()
      const rightRect = rightEl.getBoundingClientRect()

      return {
        x1: leftRect.right - containerRect.left,
        y1: leftRect.top + leftRect.height / 2 - containerRect.top,
        x2: rightRect.left - containerRect.left,
        y2: rightRect.top + rightRect.height / 2 - containerRect.top,
      }
    }).filter(Boolean) as { x1: number; y1: number; x2: number; y2: number }[]
  }

  const [lines, setLines] = useState<{ x1: number, y1: number, x2: number, y2: number }[]>([])

  useEffect(() => {
    const updateLines = () => setLines(getLinePositions())
    updateLines()
    window.addEventListener('resize', updateLines)
    return () => window.removeEventListener('resize', updateLines)
  }, [left, right, answers])

  useEffect(() => {
    const observer = new ResizeObserver(() => setLines(getLinePositions()))
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const handleEdit = (side: 'left' | 'right', index: number, value: string) => {
    if (!onEdit) return
    const newLeft = [...left]
    const newRight = [...right]
    if (side === 'left') newLeft[index] = value
    else newRight[index] = value
    onEdit(newLeft, newRight)
  }

  return (
    <div ref={containerRef} className="relative bg-white p-5 border rounded shadow-sm">
      {/* 線 */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        {lines.map((line, idx) => (
          <line
            key={idx}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="#4b5563"
            strokeWidth="2"
          />
        ))}
      </svg>

      {/* 主畫面 */}
      <div className="grid grid-cols-3 gap-8 relative z-10">
        {/* 左側 */}
        <div className="space-y-4">
          {left.map((item, i) => (
            <div key={i} ref={el => (leftRefs.current[i] = el)} className="flex items-center gap-2">
              <input
                value={item}
                onChange={e => handleEdit('left', i, e.target.value)}
                className={itemClass}
              />
              <button
                onClick={() => handleClick('left', i)}
                className={classNames(
                  'w-6 h-6 rounded-full border flex items-center justify-center',
                  selected?.side === 'left' && selected.index === i
                    ? 'bg-blue-600 text-white'
                    : answers[i] !== -1
                    ? 'bg-blue-500 text-white'
                    : 'bg-white hover:bg-gray-100'
                )}
              >
                {answers[i] !== -1 ? '✓' : ''}
              </button>
            </div>
          ))}
        </div>

        <div></div>

        {/* 右側 */}
        <div className="space-y-4">
          {right.map((item, i) => {
            const matched = answers.includes(i)

            return (
              <div key={i} ref={el => (rightRefs.current[i] = el)} className="flex items-center gap-2">
                <button
                  onClick={() => handleClick('right', i)}
                  className={classNames(
                    'w-6 h-6 rounded-full border flex items-center justify-center',
                    selected?.side === 'right' && selected.index === i
                      ? 'bg-green-600 text-white'
                      : matched
                      ? 'bg-green-500 text-white'
                      : 'bg-white hover:bg-gray-100'
                  )}
                >
                  {matched ? '✓' : ''}
                </button>
                <input
                  value={item}
                  onChange={e => handleEdit('right', i, e.target.value)}
                  className={itemClass}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
