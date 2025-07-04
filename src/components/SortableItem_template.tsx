'use client'

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical } from 'lucide-react'
import React from "react"

export default function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} className="flex items-center gap-2">
      {/* 這裡是拖曳 Handle */}
      <button {...listeners} className="cursor-move text-gray-400 hover:text-gray-600">
        <GripVertical size={18} />
      </button>
      <div className="flex-1">{children}</div>
    </div>
  )
}