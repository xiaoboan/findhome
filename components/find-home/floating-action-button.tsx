'use client'

import { useState, useRef, useImperativeHandle, forwardRef } from 'react'
import { Plus, Camera, FileText, Sparkles, X, Loader2, CheckCircle2, RotateCw, ImageIcon, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ColumnConfig } from '@/types/property'
import { parseScreenshot, ParsedProperty } from '@/lib/ai'
import { Progress } from '@/components/ui/progress'

interface FloatingActionButtonProps {
  onAddProperty: () => void
  onAddFromScreenshot: (data: ParsedProperty, imageFile: File) => void
  columns: ColumnConfig[]
}

export interface FloatingActionButtonRef {
  triggerScreenshot: () => void
}

type TaskStatus = 'pending' | 'parsing' | 'done' | 'error'

interface ParseTask {
  id: string
  file: File
  preview: string
  status: TaskStatus
  result?: ParsedProperty
  error?: string
}

export const FloatingActionButton = forwardRef<FloatingActionButtonRef, FloatingActionButtonProps>(function FloatingActionButton({ onAddProperty, onAddFromScreenshot, columns }, ref) {
  const [isOpen, setIsOpen] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [tasks, setTasks] = useState<ParseTask[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    triggerScreenshot: () => {
      // 有后台任务时，重新打开弹窗
      if (hasBackgroundTasks) {
        setShowDialog(true)
      } else {
        fileInputRef.current?.click()
      }
    },
  }))

  const doneCount = tasks.filter(t => t.status === 'done').length
  const errorCount = tasks.filter(t => t.status === 'error').length
  const totalCount = tasks.length
  const isAllFinished = totalCount > 0 && doneCount + errorCount === totalCount
  const hasBackgroundTasks = totalCount > 0 && !isAllFinished && !showDialog
  const progressPercent = totalCount > 0 ? Math.round(((doneCount + errorCount) / totalCount) * 100) : 0

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const newTasks: ParseTask[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as TaskStatus,
    }))

    setTasks(newTasks)
    setShowDialog(true)

    // 清空 input，允许再次选择
    if (fileInputRef.current) fileInputRef.current.value = ''

    // 并行识别所有图片
    for (const task of newTasks) {
      processTask(task.id, task.file, newTasks)
    }
  }

  const processTask = async (taskId: string, file: File, currentTasks?: ParseTask[]) => {
    setTasks(prev => {
      const base = currentTasks || prev
      return base.map(t => t.id === taskId ? { ...t, status: 'parsing' as TaskStatus, error: undefined } : t)
    })

    try {
      const base64 = await fileToBase64(file)
      const data = await parseScreenshot(base64, file.type, columns)

      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: 'done' as TaskStatus, result: data } : t
      ))

      // 识别成功自动入库
      onAddFromScreenshot(data, file)
    } catch (err) {
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: 'error' as TaskStatus, error: err instanceof Error ? err.message : '识别失败' } : t
      ))
    }
  }

  const handleRetry = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      processTask(taskId, task.file)
    }
  }

  // 后台执行：关闭弹窗但保留任务状态
  const handleMinimize = () => {
    setShowDialog(false)
  }

  // 彻底关闭：释放资源并清空任务
  const handleClose = () => {
    tasks.forEach(t => URL.revokeObjectURL(t.preview))
    setShowDialog(false)
    setTasks([])
  }

  // 点击悬浮按钮
  const handleFabClick = () => {
    // 有后台任务，打开任务弹窗
    if (hasBackgroundTasks || (totalCount > 0 && !showDialog)) {
      setShowDialog(true)
      return
    }
    setIsOpen(!isOpen)
  }

  // 格式化单条识别结果的摘要
  const formatSummary = (data: ParsedProperty): string => {
    const parts: string[] = []
    if (data.name) parts.push(data.name)
    if (data.layout) parts.push(data.layout)
    if (data.area) parts.push(`${data.area}m²`)
    if (data.price) parts.push(`${data.price}万`)
    return parts.join(' · ') || '已识别'
  }

  const actions = [
    {
      icon: Camera,
      label: '截图识别',
      onClick: () => fileInputRef.current?.click(),
    },
    { icon: FileText, label: '手动添加', onClick: onAddProperty },
    { icon: Sparkles, label: 'AI分析', onClick: () => console.log('AI分析') },
  ]

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="fixed bottom-16 md:bottom-6 right-4 md:right-6 z-50 pointer-events-none">
        <div
          className={`mb-3 flex flex-col gap-2 transition-all duration-200 ${
            isOpen && !hasBackgroundTasks ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4'
          }`}
        >
          {actions.map((action) => (
            <Button
              key={action.label}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2 bg-card shadow-lg hover:bg-accent border border-border"
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

        <div className="relative pointer-events-auto">
          <Button
            size="icon"
            className={`h-12 w-12 md:h-14 md:w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95 ${
              isOpen && !hasBackgroundTasks ? 'rotate-45' : ''
            }`}
            onClick={handleFabClick}
          >
            {isOpen && !hasBackgroundTasks ? (
              <X className="h-6 w-6 text-primary-foreground" />
            ) : hasBackgroundTasks ? (
              <Loader2 className="h-6 w-6 text-primary-foreground animate-spin" />
            ) : (
              <Plus className="h-6 w-6 text-primary-foreground" />
            )}
          </Button>

          {/* 后台任务进度徽标 */}
          {hasBackgroundTasks && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-bold text-white shadow-sm">
              {doneCount}/{totalCount}
            </span>
          )}
        </div>
      </div>

      {/* 批量识别弹窗 */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open && isAllFinished) handleClose() }}>
        <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => { if (!isAllFinished) e.preventDefault() }}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 pr-6">
              <span className="shrink-0">截图识别</span>
              <span className="text-sm font-normal text-muted-foreground text-right">
                {isAllFinished
                  ? `完成 ${doneCount}/${totalCount}${errorCount > 0 ? `，失败 ${errorCount}` : ''}`
                  : `识别中 ${doneCount + errorCount}/${totalCount}`
                }
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {/* 总体进度条 */}
            {!isAllFinished && (
              <Progress value={progressPercent} className="h-1.5" />
            )}

            {/* 任务列表 */}
            <div className="space-y-2 max-h-64 sm:max-h-80 overflow-y-auto">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2.5 sm:gap-3 rounded-lg border border-border p-2 sm:p-2.5 transition-colors"
                >
                  {/* 缩略图 */}
                  <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={task.preview} alt="" className="h-full w-full object-cover object-top" />
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    {task.status === 'done' && task.result ? (
                      <p className="text-sm font-medium truncate">{formatSummary(task.result)}</p>
                    ) : task.status === 'error' ? (
                      <p className="text-sm text-destructive truncate">{task.error}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground truncate">{task.file.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {task.status === 'pending' && '等待中...'}
                      {task.status === 'parsing' && '正在识别...'}
                      {task.status === 'done' && '已添加到房源列表'}
                      {task.status === 'error' && '识别失败'}
                    </p>
                  </div>

                  {/* 状态图标 */}
                  <div className="shrink-0">
                    {task.status === 'pending' && (
                      <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    )}
                    {task.status === 'parsing' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {task.status === 'done' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {task.status === 'error' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                        onClick={() => handleRetry(task.id)}
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="flex justify-end gap-2 pt-1">
            {isAllFinished ? (
              <Button onClick={handleClose}>
                完成
              </Button>
            ) : (
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleMinimize}
              >
                <Minimize2 className="h-4 w-4" />
                后台执行
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
})

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      resolve(dataUrl.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
