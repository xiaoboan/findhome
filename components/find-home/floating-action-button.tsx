'use client'

import { useState } from 'react'
import { Plus, Camera, FileText, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FloatingActionButtonProps {
  onAddProperty: () => void
}

export function FloatingActionButton({ onAddProperty }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const actions = [
    { icon: Camera, label: '拍照记录', onClick: () => console.log('拍照') },
    { icon: FileText, label: '写文字', onClick: onAddProperty },
    { icon: Sparkles, label: 'AI分析', onClick: () => console.log('AI分析') },
  ]

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* 展开的操作按钮 */}
      <div
        className={`mb-3 flex flex-col gap-2 transition-all duration-200 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 bg-background shadow-lg hover:bg-secondary"
            onClick={() => {
              action.onClick()
              setIsOpen(false)
            }}
          >
            <action.icon className="h-4 w-4 text-primary" />
            <span>{action.label}</span>
          </Button>
        ))}
      </div>

      {/* 主按钮 */}
      <Button
        size="icon"
        className={`h-14 w-14 rounded-full bg-primary shadow-lg transition-transform duration-200 hover:bg-primary/90 active:scale-95 ${
          isOpen ? 'rotate-45' : ''
        }`}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-primary-foreground" />
        ) : (
          <Plus className="h-6 w-6 text-primary-foreground" />
        )}
      </Button>
    </div>
  )
}
