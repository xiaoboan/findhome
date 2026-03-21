'use client'

import { useState, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import { Plus, Camera, FileText, X, Loader2, CheckCircle2, RotateCw, ImageIcon, Minimize2, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ColumnConfig, PropertyMode } from '@/types/property'
import { parseScreenshot, ParsedProperty } from '@/lib/ai'
import { Progress } from '@/components/ui/progress'
import { useIsMobile } from '@/hooks/use-mobile'

interface FloatingActionButtonProps {
  onAddProperty: () => void
  onAddFromScreenshot: (data: ParsedProperty, imageFile: File) => void
  columns: ColumnConfig[]
  propertyMode: PropertyMode
}

export interface FloatingActionButtonRef {
  triggerScreenshot: () => void
}

type TaskStatus = 'pending' | 'parsing' | 'done' | 'error' | 'cancelled'

interface ParseTask {
  id: string
  file: File
  preview: string
  status: TaskStatus
  result?: ParsedProperty
  error?: string
}

export const FloatingActionButton = forwardRef<FloatingActionButtonRef, FloatingActionButtonProps>(function FloatingActionButton({ onAddProperty, onAddFromScreenshot, columns, propertyMode }, ref) {
  const [isOpen, setIsOpen] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [tasks, setTasks] = useState<ParseTask[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isMobile = useIsMobile()

  const doneCount = tasks.filter(t => t.status === 'done').length
  const errorCount = tasks.filter(t => t.status === 'error').length
  const cancelledCount = tasks.filter(t => t.status === 'cancelled').length
  const totalCount = tasks.length
  const finishedCount = doneCount + errorCount + cancelledCount
  const isAllFinished = totalCount > 0 && finishedCount === totalCount
  const hasBackgroundTasks = totalCount > 0 && !isAllFinished && !showDialog
  const progressPercent = totalCount > 0 ? Math.round((finishedCount / totalCount) * 100) : 0

  useImperativeHandle(ref, () => ({
    triggerScreenshot: () => {
      if (hasBackgroundTasks || (totalCount > 0 && !showDialog)) {
        setShowDialog(true)
      } else {
        fileInputRef.current?.click()
      }
    },
  }))

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController()

    const newTasks: ParseTask[] = Array.from(files).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as TaskStatus,
    }))

    setTasks(newTasks)
    setShowDialog(true)

    if (fileInputRef.current) fileInputRef.current.value = ''

    for (const task of newTasks) {
      processTask(task.id, task.file, newTasks)
    }
  }

  const processTask = async (taskId: string, file: File, currentTasks?: ParseTask[]) => {
    // 检查是否已被取消
    if (abortControllerRef.current?.signal.aborted) {
      setTasks(prev => prev.map(t =>
        t.id === taskId && (t.status === 'pending' || t.status === 'parsing')
          ? { ...t, status: 'cancelled' as TaskStatus }
          : t
      ))
      return
    }

    setTasks(prev => {
      const base = currentTasks || prev
      return base.map(t => t.id === taskId ? { ...t, status: 'parsing' as TaskStatus, error: undefined } : t)
    })

    try {
      const { base64, mimeType, compressedFile } = await compressImage(file)

      // 再次检查取消状态
      if (abortControllerRef.current?.signal.aborted) {
        setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: 'cancelled' as TaskStatus } : t
        ))
        return
      }

      const data = await parseScreenshot(base64, mimeType, columns, propertyMode)

      if (abortControllerRef.current?.signal.aborted) {
        setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: 'cancelled' as TaskStatus } : t
        ))
        return
      }

      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: 'done' as TaskStatus, result: data } : t
      ))

      onAddFromScreenshot(data, compressedFile)
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: 'cancelled' as TaskStatus } : t
        ))
        return
      }
      console.error('截图识别失败:', err)
      let errorMsg = '识别失败'
      if (err instanceof Error) {
        if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMsg = '网络连接失败，请检查网络后重试'
        } else if (err.message.includes('413') || err.message.includes('too large') || err.message.includes('body')) {
          errorMsg = '图片过大，请使用截图而非原图'
        } else {
          errorMsg = err.message
        }
      }
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, status: 'error' as TaskStatus, error: errorMsg } : t
      ))
    }
  }

  const handleRetry = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      // 重试时如果 controller 已 abort，创建新的
      if (abortControllerRef.current?.signal.aborted) {
        abortControllerRef.current = new AbortController()
      }
      processTask(taskId, task.file)
    }
  }

  // 停止识别：取消所有未完成的任务
  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort()
    setTasks(prev => prev.map(t =>
      t.status === 'pending' || t.status === 'parsing'
        ? { ...t, status: 'cancelled' as TaskStatus }
        : t
    ))
    setShowStopConfirm(false)
  }, [])

  // 后台执行
  const handleMinimize = () => {
    setShowDialog(false)
  }

  // 彻底关闭
  const handleClose = useCallback(() => {
    abortControllerRef.current?.abort()
    tasks.forEach(t => URL.revokeObjectURL(t.preview))
    setShowDialog(false)
    setShowStopConfirm(false)
    setTasks([])
  }, [tasks])

  // 点击弹窗 X 按钮或外部关闭
  const handleDialogClose = useCallback(() => {
    if (isAllFinished) {
      handleClose()
    } else {
      setShowStopConfirm(true)
    }
  }, [isAllFinished, handleClose])

  // 点击悬浮按钮
  const handleFabClick = () => {
    if (hasBackgroundTasks || (totalCount > 0 && !showDialog)) {
      setShowDialog(true)
      return
    }
    setIsOpen(!isOpen)
  }

  const formatSummary = (data: ParsedProperty): string => {
    const parts: string[] = []
    if (data.name) parts.push(data.name)
    if (data.layout) parts.push(data.layout)
    if (data.area) parts.push(`${data.area}m²`)
    if (data.price) parts.push(`${data.price}万`)
    return parts.join(' · ') || '已识别'
  }

  const actions = [
    { icon: Camera, label: '截图识别', onClick: () => fileInputRef.current?.click() },
    { icon: FileText, label: '手动添加', onClick: onAddProperty },
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

      <div className={`fixed bottom-16 md:bottom-6 right-4 md:right-6 z-50 pointer-events-none ${isMobile && !hasBackgroundTasks ? 'hidden' : ''}`}>
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

          {hasBackgroundTasks && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-bold text-white shadow-sm">
              {doneCount}/{totalCount}
            </span>
          )}
        </div>
      </div>

      {/* 批量识别弹窗 */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) handleDialogClose() }}>
        <DialogContent className="sm:max-w-lg p-4 sm:p-6" onPointerDownOutside={(e) => { if (!isAllFinished) e.preventDefault() }}>
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 pr-6">
              <span className="shrink-0">截图识别</span>
              <span className="text-sm font-normal text-muted-foreground text-right">
                {isAllFinished
                  ? `完成 ${doneCount}/${totalCount}${errorCount > 0 ? `，失败 ${errorCount}` : ''}${cancelledCount > 0 ? `，已停止 ${cancelledCount}` : ''}`
                  : `识别中 ${doneCount + errorCount}/${totalCount}`
                }
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {!isAllFinished && (
              <Progress value={progressPercent} className="h-1.5" />
            )}

            <div className="space-y-2 max-h-64 sm:max-h-80 overflow-y-auto">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-2.5 sm:gap-3 rounded-lg border border-border p-2 sm:p-2.5 transition-colors ${
                    task.status === 'cancelled' ? 'opacity-50' : ''
                  }`}
                >
                  <div className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={task.preview} alt="" className="h-full w-full object-cover object-top" />
                  </div>

                  <div className="flex-1 min-w-0 overflow-hidden">
                    {task.status === 'done' && task.result ? (
                      <p className="text-xs sm:text-sm font-medium truncate">{formatSummary(task.result)}</p>
                    ) : task.status === 'error' ? (
                      <p className="text-xs sm:text-sm text-destructive truncate">{task.error}</p>
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">{task.file.name}</p>
                    )}
                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
                      {task.status === 'pending' && '等待中...'}
                      {task.status === 'parsing' && '正在识别...'}
                      {task.status === 'done' && '已添加到房源列表'}
                      {task.status === 'error' && '识别失败'}
                      {task.status === 'cancelled' && '已停止'}
                    </p>
                  </div>

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
                    {task.status === 'cancelled' && (
                      <Square className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="flex justify-end gap-2">
            {isAllFinished ? (
              <Button size="sm" onClick={handleClose}>
                完成
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setShowStopConfirm(true)}
                >
                  <Square className="h-3 w-3 fill-current" />
                  停止
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={handleMinimize}
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  后台执行
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 停止确认弹窗 */}
      <AlertDialog open={showStopConfirm} onOpenChange={setShowStopConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>停止识别</AlertDialogTitle>
            <AlertDialogDescription>
              还有 {totalCount - finishedCount} 张图片未完成识别，已完成的 {doneCount} 张不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>继续识别</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleStop}
            >
              停止识别
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
})

// 压缩图片：移动端拍照/截图可能很大（5-10MB），需压缩到合理大小
function compressImage(file: File, maxSizeMB = 2, maxDimension = 2048): Promise<{ base64: string; mimeType: string; compressedFile: File }> {
  return new Promise((resolve, reject) => {
    // 如果已经足够小且是 JPEG/PNG/WebP，直接转 base64
    if (file.size <= maxSizeMB * 1024 * 1024 && /^image\/(jpeg|png|webp)$/.test(file.type)) {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        resolve({
          base64: dataUrl.split(',')[1],
          mimeType: file.type,
          compressedFile: file,
        })
      }
      reader.onerror = () => reject(new Error('图片读取失败'))
      reader.readAsDataURL(file)
      return
    }

    // 需要压缩：通过 canvas 缩放 + 转 JPEG
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      let { width, height } = img

      // 限制最大尺寸
      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('无法创建 Canvas'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      // 逐步降低质量直到满足大小限制
      let quality = 0.85
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('图片压缩失败'))
              return
            }
            if (blob.size > maxSizeMB * 1024 * 1024 && quality > 0.3) {
              quality -= 0.15
              tryCompress()
              return
            }
            const reader = new FileReader()
            reader.onload = () => {
              const dataUrl = reader.result as string
              const compressedFile = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' })
              resolve({
                base64: dataUrl.split(',')[1],
                mimeType: 'image/jpeg',
                compressedFile,
              })
            }
            reader.onerror = () => reject(new Error('压缩图片读取失败'))
            reader.readAsDataURL(blob)
          },
          'image/jpeg',
          quality,
        )
      }
      tryCompress()
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('图片加载失败，可能格式不支持'))
    }

    img.src = url
  })
}
