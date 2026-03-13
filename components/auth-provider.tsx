'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { getSupabase } from '@/lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, username?: string) => Promise<{ error: string | null }>
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null
    let settled = false

    const settle = () => {
      if (!settled) {
        settled = true
        setLoading(false)
      }
    }

    // 10秒超时兜底，防止网络问题导致永远加载
    const timeout = setTimeout(() => {
      if (!settled) {
        console.warn('认证检查超时，跳过加载')
        settle()
      }
    }, 10000)

    try {
      const sb = getSupabase()

      // 获取当前 session
      sb.auth.getSession()
        .then(({ data: { session } }) => {
          setSession(session)
          setUser(session?.user ?? null)
        })
        .catch((err) => {
          console.error('获取会话失败:', err)
        })
        .finally(() => {
          settle()
        })

      // 监听登录状态变化
      const { data } = sb.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      })
      subscription = data.subscription
    } catch (err) {
      // getSupabase() 可能因配置缺失抛出同步错误
      console.error('Supabase 初始化失败:', err)
      settle()
    }

    return () => {
      clearTimeout(timeout)
      subscription?.unsubscribe()
    }
  }, [])

  const signUp = async (email: string, password: string, username?: string) => {
    const { error } = await getSupabase().auth.signUp({
      email,
      password,
      options: {
        data: { username },
      },
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  const signOut = async () => {
    await getSupabase().auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
