'use client'

import { useState, useRef, useImperativeHandle, forwardRef } from 'react'
import { Plus, Camera, FileText, Sparkles, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ColumnConfig } from '@/types/property'
import { parseScreenshot, ParsedProperty } from '@/lib/ai'

interface FloatingActionButtonProps {
  onAddProperty: () => void
  onAddFromScreenshot: (data: ParsedProperty, imageFile: File) => void
  columns: ColumnConfig[]
}

export interface FloatingActionButtonRef {
  triggerScreenshot: () => void
}

export const FloatingActionButton = forwardRef<FloatingActionButtonRef, FloatingActionButtonProps>(function FloatingActionButton({ onAddProperty, onAddFromScreenshot, columns }, ref) {
  const [isOpen, setIsOpen] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<ParsedProperty | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDialog, setShowDialog] = useState(false)
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useImperativeHandle(ref, () => ({
    triggerScreenshot: () => fileInputRef.current?.click(),
  }))

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 重置
    setError(null)
    setResult(null)
    setScreenshotFile(file)
    setPreview(URL.createObjectURL(file))
    setShowDialog(true)
    setParsing(true)

    try {
      const base64 = await fileToBase64(file)
      const data = await parseScreenshot(base64, file.type, columns)
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '识别失败')
    } finally {
      setParsing(false)
      // 清空 input，允许再次选择同一文件
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleConfirm = () => {
    if (result && screenshotFile) {
      onAddFromScreenshot(result, screenshotFile)
    }
    handleClose()
  }

  const handleClose = () => {
    setShowDialog(false)
    setPreview(null)
    setResult(null)
    setError(null)
    setParsing(false)
    setScreenshotFile(null)
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

  // 格式化识别结果供展示
  const formatResult = (data: ParsedProperty) => {
    const lines: { label: string; value: string }[] = []
    if (data.name) lines.push({ label: '小区', value: data.name })
    if (data.roomNumber) lines.push({ label: '房号', value: data.roomNumber })
    if (data.price) lines.push({ label: '总价', value: `${data.price}万` })
    if (data.pricePerSqm) lines.push({ label: '单价', value: `${data.pricePerSqm}万/㎡` })
    if (data.layout) lines.push({ label: '户型', value: data.layout })
    if (data.area) lines.push({ label: '面积', value: `${data.area}㎡` })
    if (data.district) lines.push({ label: '区域', value: data.district })
    if (data.floor) lines.push({ label: '楼层', value: data.floor })
    if (data.orientation) lines.push({ label: '朝向', value: data.orientation })
    if (data.decoration) lines.push({ label: '装修', value: data.decoration })
    if (data.age) lines.push({ label: '房龄', value: `${data.age}年` })
    if (data.tags?.length) lines.push({ label: '标签', value: data.tags.join('、') })
    if (data.customFields) {
      for (const [key, val] of Object.entries(data.customFields)) {
        const col = columns.find(c => c.key === key)
        if (col && val !== undefined && val !== '') {
          lines.push({ label: col.label, value: String(val) })
        }
      }
    }
    return lines
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="fixed bottom-16 md:bottom-6 right-4 md:right-6 z-50 pointer-events-none">
        <div
          className={`mb-3 flex flex-col gap-2 transition-all duration-200 ${
            isOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4'
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

        <Button
          size="icon"
          className={`pointer-events-auto h-12 w-12 md:h-14 md:w-14 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95 ${
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

      {/* 识别结果弹窗 */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) handleClose() }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>截图识别</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 截图预览 */}
            {preview && (
              <div className="relative max-h-48 overflow-hidden rounded-lg border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="截图" className="w-full object-contain" />
              </div>
            )}

            {/* 加载中 */}
            {parsing && (
              <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>正在识别房源信息...</span>
              </div>
            )}

            {/* 错误 */}
            {error && (
              <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* 识别结果 */}
            {result && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">识别结果：</p>
                <div className="rounded-lg border border-border p-3 space-y-1.5">
                  {formatResult(result).map(({ label, value }) => (
                    <div key={label} className="flex text-sm">
                      <span className="w-16 shrink-0 text-muted-foreground">{label}</span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 底部按钮 */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClose}>
              取消
            </Button>
            {error && (
              <Button onClick={() => fileInputRef.current?.click()}>
                重新选择
              </Button>
            )}
            {result && (
              <Button onClick={handleConfirm}>
                添加到房源列表
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
      // 去掉 data:image/xxx;base64, 前缀
      resolve(dataUrl.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
