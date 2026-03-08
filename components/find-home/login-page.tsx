'use client'

import { useState } from 'react'
import { Home, Lock, User } from 'lucide-react'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginPage() {
  const { signIn, signUp } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
    // 用 用户名@findhome.local 作为 Supabase 邮箱，对用户透明
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/20 px-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Home className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">寻家</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">找到温馨的家</p>
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
  )
}

function translateError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return '用户名或密码错误'
  if (msg.includes('User already registered')) return '该用户名已注册'
  if (msg.includes('Email not confirmed')) return '登录失败，请检查用户名和密码'
  if (msg.includes('Password should be')) return '密码至少 6 位'
  return msg
}
