'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, X, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// 是否已经安装为 standalone
function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

// 是否为 iOS
function isIOS() {
  if (typeof window === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: unknown }).MSStream
}

const DISMISS_KEY = 'pwa-install-dismissed'
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 天后再次提示

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    // Android/Chrome: 监听 beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    // iOS: 检查是否已关闭过
    if (isIOS()) {
      const dismissed = localStorage.getItem(DISMISS_KEY)
      if (!dismissed || Date.now() - Number(dismissed) > DISMISS_DURATION) {
        setShowIOSGuide(true)
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setCanInstall(false)
      setDeferredPrompt(null)
    }
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    setCanInstall(false)
    setShowIOSGuide(false)
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  }, [])

  return {
    canInstall,
    showIOSGuide,
    isInstalled: isStandalone(),
    install,
    dismiss,
  }
}

export function PwaInstallBanner() {
  const { canInstall, showIOSGuide, install, dismiss } = usePwaInstall()
  const [visible, setVisible] = useState(false)

  // 延迟 3 秒显示，避免打断用户
  useEffect(() => {
    if (!canInstall && !showIOSGuide) return
    const timer = setTimeout(() => setVisible(true), 3000)
    return () => clearTimeout(timer)
  }, [canInstall, showIOSGuide])

  if (!visible) return null

  // Android / Chrome 安装提示
  if (canInstall) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300 md:bottom-4 md:left-auto md:right-4 md:max-w-sm">
        <div className="mx-2 mb-2 flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-lg md:mx-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">安装寻家到桌面</p>
            <p className="text-xs text-muted-foreground">像 App 一样使用，更流畅</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" className="h-8 px-3 text-xs" onClick={install}>
              安装
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={dismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // iOS 手动安装引导
  if (showIOSGuide) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="mx-2 mb-2 rounded-xl border border-border bg-card p-3 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">添加寻家到主屏幕</p>
              <p className="mt-1 text-xs text-muted-foreground">
                点击底部
                <Share className="mx-0.5 inline h-3.5 w-3.5 -translate-y-px" />
                分享按钮，然后选择「添加到主屏幕」
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 text-muted-foreground"
              onClick={dismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
