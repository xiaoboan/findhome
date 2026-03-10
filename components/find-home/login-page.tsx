'use client'

import { useState, useRef } from 'react'
import { Home, Lock, User, Table2, Camera, GitCompareArrows, Pencil, ClipboardList, MapPin, ChevronDown } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    icon: Table2,
    title: '房源大表格',
    desc: '所有房源信息一目了然，支持排序、搜索、标签筛选',
  },
  {
    icon: Pencil,
    title: '表格内编辑',
    desc: '直接在表格里修改数据，支持自定义列',
  },
  {
    icon: Camera,
    title: '截图识别',
    desc: '贝壳/链家截图自动识别，AI 提取房源数据一键入库',
  },
  {
    icon: GitCompareArrows,
    title: '多房源对比',
    desc: '勾选 2-3 套一键对比，关键字段对齐，差异高亮',
  },
  {
    icon: ClipboardList,
    title: '看房记录',
    desc: '结构化备注 + 照片上传，时间轴展示每次看房',
  },
  {
    icon: MapPin,
    title: '地图定位',
    desc: '房源位置一键标注地图，直观对比各小区地理分布',
  },
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
      {/* Hero */}
      <section className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 text-center">
        <div className="mx-auto mb-4 md:mb-6 flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-3xl bg-primary shadow-xl">
          <Home className="h-8 w-8 md:h-10 md:w-10 text-primary-foreground" />
        </div>
        <h1 className="mb-2 md:mb-3 text-3xl font-bold tracking-tight text-foreground md:text-5xl">
          寻家
        </h1>
        <p className="mb-2 text-lg text-primary font-medium md:text-xl">
          让每一次看房都有迹可循
        </p>
        <p className="mb-8 max-w-md text-sm text-muted-foreground md:text-base">
          一张可编辑的房源对比大表格，替代你看房时的 Excel 和备忘录
        </p>
        <div className="flex gap-3">
          <Button size="lg" onClick={scrollToForm} className="px-8 shadow-lg">
            免费使用
          </Button>
        </div>

        {/* 向下滚动提示 */}
        <button
          onClick={scrollToForm}
          className="absolute bottom-8 animate-bounce text-muted-foreground hover:text-primary transition-colors"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </section>

      {/* 痛点 */}
      <section className="border-t border-border/50 bg-card/50 py-12 md:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="mb-8 md:mb-10 text-xl font-bold text-foreground md:text-3xl">看房人的烦恼</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { emoji: '😵', text: '看了几十套房，信息散落在收藏夹、备忘录、Excel 各处' },
              { emoji: '😤', text: '贝壳/链家的收藏只是浏览历史，无法编辑和备注' },
              { emoji: '🤯', text: '"主卧西晒"、"房东急售"这些关键信息没地方记录' },
            ].map((item) => (
              <div key={item.text} className="rounded-2xl bg-background p-6 shadow-sm border border-border/50">
                <span className="mb-3 block text-3xl">{item.emoji}</span>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 功能亮点 */}
      <section className="py-12 md:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-8 md:mb-10 text-center text-xl font-bold text-foreground md:text-3xl">核心功能</h2>
          <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-border/50 bg-card p-4 md:p-6 shadow-sm transition-all hover:shadow-md hover:border-primary/30"
              >
                <div className="mb-3 md:mb-4 flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <h3 className="mb-1 md:mb-2 text-sm md:text-base font-semibold text-foreground">{f.title}</h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
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
                {isSignUp ? '创建账号' : '登录'}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {isSignUp ? '注册后自动生成示例数据，立即体验' : '欢迎回来'}
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
                      placeholder="请输入用户名"
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
                  className="w-full"
                  disabled={submitting}
                >
                  {submitting ? '请稍候...' : isSignUp ? '注册' : '登录'}
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
                    {isSignUp ? '去登录' : '注册一个'}
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
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
