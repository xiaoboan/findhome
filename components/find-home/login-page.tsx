'use client'

import { useState, useRef } from 'react'
import { Home, Lock, User, Camera, GitCompareArrows, MapPin, ChevronDown, Pencil, ClipboardList, Table2, Shield, Zap, Smartphone } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// 核心亮点（前3个大卡片展示）
const highlights = [
  {
    icon: Camera,
    title: '截图秒录入',
    desc: '贝壳、链家截图直接丢进来，AI 自动识别价格、户型、面积，一键入库',
    tag: 'AI 加持',
  },
  {
    icon: GitCompareArrows,
    title: '多套并排对比',
    desc: '勾选 2-3 套一键对比，价格、面积、楼层差异一目了然，不再靠脑子记',
    tag: '决策利器',
  },
  {
    icon: MapPin,
    title: '地图看位置',
    desc: '所有候选房源标注在地图上，哪个离地铁近、哪个离学校远，一眼就知道',
    tag: '直观对比',
  },
]

// 更多功能
const moreFeatures = [
  { icon: Table2, title: '房源大表格', desc: '一目了然，排序筛选随意切换' },
  { icon: Pencil, title: '表格内编辑', desc: '点哪改哪，支持自定义列' },
  { icon: ClipboardList, title: '看房记录', desc: '文字+照片，时间轴回顾' },
]

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const formRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username.trim()) {
      setError('请输入用户名')
      return
    }
    if (!password) {
      setError('请输入密码')
      return
    }
    if (isSignUp && password.length < 6) {
      setError('密码至少 6 位')
      return
    }

    setSubmitting(true)
    const fakeEmail = `${username.trim().toLowerCase()}@findhome.local`

    if (isSignUp) {
      const { error: err } = await signUp(fakeEmail, password, username.trim())
      if (err) {
        setError(translateError(err))
      }
    } else {
      const { error: err } = await signIn(fakeEmail, password)
      if (err) {
        setError(translateError(err))
      }
    }
    setSubmitting(false)
  }

  const scrollToForm = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/20">
      {/* Hero - 场景化标题 */}
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 text-center">
        <div className="mx-auto mb-5 md:mb-6 flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-3xl bg-primary shadow-xl">
          <Home className="h-8 w-8 md:h-10 md:w-10 text-primary-foreground" />
        </div>
        <h1 className="mb-3 md:mb-4 text-2xl font-bold tracking-tight text-foreground md:text-5xl leading-tight">
          看了 30 套房，<br className="md:hidden" />哪套最值得买？
        </h1>
        <p className="mb-2 text-base text-primary font-medium md:text-xl">
          寻家 — 让每一次看房都有迹可循
        </p>
        <p className="mb-8 max-w-lg text-sm text-muted-foreground md:text-base leading-relaxed">
          截图自动录入、表格在线对比、地图看位置<br className="hidden md:block" />
          替代你看房时的 Excel 和备忘录，帮你做出更好的决策
        </p>
        <div className="flex flex-col items-center gap-3">
          <Button size="lg" onClick={scrollToForm} className="px-10 shadow-lg text-base h-12">
            免费开始使用
          </Button>
          <p className="text-xs text-muted-foreground">
            无需下载 &middot; 注册即送示例数据
          </p>
        </div>

        <button
          onClick={scrollToForm}
          className="absolute bottom-8 animate-bounce text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </section>

      {/* 痛点 - 场景化、差异化 */}
      <section className="border-t border-border/50 bg-card/50 py-12 md:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-3 md:mb-4 text-xl font-bold text-foreground md:text-3xl">你是不是也这样？</h2>
          <p className="mb-8 md:mb-10 text-sm text-muted-foreground">每个看过房的人都经历过</p>
          <div className="grid gap-4 md:gap-6 md:grid-cols-3">
            {[
              {
                emoji: '🏃',
                title: '看完就忘',
                text: '上周看的那套，主卧朝南还是朝西来着？几楼？多少钱？想不起来了...',
              },
              {
                emoji: '🤹',
                title: '没法对比',
                text: '5 套候选房，价格、面积、户型全靠脑子记，Excel 来回切换头都大了',
              },
              {
                emoji: '📝',
                title: '关键信息丢了',
                text: '"房东急售可砍 10 万"、"隔壁在施工" 这些只有现场才知道的信息，没地方记',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-background p-5 md:p-6 shadow-sm border border-border/50 text-left">
                <span className="mb-2 block text-2xl md:text-3xl">{item.emoji}</span>
                <h3 className="mb-1.5 text-sm md:text-base font-semibold text-foreground">{item.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 解决方案过渡 */}
      <section className="py-10 md:py-14">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <p className="text-lg md:text-2xl font-bold text-foreground">
            寻家帮你把<span className="text-primary">看房信息</span>管得明明白白
          </p>
        </div>
      </section>

      {/* 核心亮点 - 3个大卡片 */}
      <section className="pb-8 md:pb-12">
        <div className="mx-auto max-w-4xl px-4">
          <div className="grid gap-4 md:gap-6 md:grid-cols-3">
            {highlights.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border/50 bg-card p-5 md:p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
              >
                <div className="mb-3 flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <f.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {f.tag}
                  </span>
                </div>
                <h3 className="mb-1.5 text-base md:text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 更多功能 - 紧凑一行 */}
      <section className="pb-12 md:pb-20">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex flex-wrap justify-center gap-3 md:gap-4">
            {moreFeatures.map((f) => (
              <div
                key={f.title}
                className="flex items-center gap-2.5 rounded-full border border-border/50 bg-card px-4 py-2.5 shadow-sm"
              >
                <f.icon className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground">{f.title}</span>
                  <span className="text-xs text-muted-foreground ml-1.5 hidden sm:inline">{f.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 注册/登录 */}
      <section ref={formRef} className="border-t border-border/50 bg-card/50 py-12 md:py-20">
        <div className="mx-auto max-w-md px-4">
          <Card className="shadow-xl border-border/50">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl font-bold text-foreground">
                {isSignUp ? '30 秒创建账号' : '欢迎回来'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isSignUp ? '注册后自动生成示例数据，立即体验全部功能' : '登录后继续你的看房决策'}
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">用户名</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="username"
                      placeholder="给自己取个名字"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder={isSignUp ? '至少 6 位' : '请输入密码'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11"
                  disabled={submitting}
                >
                  {submitting ? '请稍候...' : isSignUp ? '免费注册' : '登录'}
                </Button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  {isSignUp ? '已有账号？' : '没有账号？'}
                  <button
                    onClick={() => {
                      setIsSignUp(!isSignUp)
                      setError('')
                    }}
                    className="ml-1 font-medium text-primary hover:underline"
                  >
                    {isSignUp ? '去登录' : '免费注册'}
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 信任要素 */}
          <div className="mt-6 flex items-center justify-center gap-4 md:gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Zap className="h-3.5 w-3.5" />
              永久免费
            </span>
            <span className="flex items-center gap-1">
              <Smartphone className="h-3.5 w-3.5" />
              手机电脑都能用
            </span>
            <span className="flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" />
              数据仅自己可见
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 text-center text-xs text-muted-foreground">
        <p>寻家 Find Home &mdash; 让寻家之路更轻松</p>
      </footer>
    </div>
  )
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return '用户名或密码错误'
  if (msg.includes('User already registered')) return '该用户名已注册'
  if (msg.includes('Email not confirmed')) return '登录失败，请检查用户名和密码'
  if (msg.includes('Password should be')) return '密码至少 6 位'
  return msg
}
