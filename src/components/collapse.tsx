'use client'


import * as React from 'react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@radix-ui/react-collapsible'
import { ChevronDown } from 'lucide-react'


interface CollapseProps {
  title: string
  children: React.ReactNode
}


export function Collapse({ title, children }: CollapseProps) {
  const [open, setOpen] = React.useState(false)


  return (
    <Collapsible open={open} onOpenChange={setOpen} className="space-y-2">
      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 bg-gray-100 rounded text-left text-sm font-medium hover:bg-gray-200">
        {title}
        <ChevronDown className={`ml-2 transition-transform ${open ? 'rotate-180' : ''}`} size={16} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pt-2 text-sm text-gray-700">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

