import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { guides } from './content'

export const metadata: Metadata = {
  title: '找房实用指南｜看房记录、房源对比与租房清单',
  description: '整理买房租房时真正有用的记录方法、候选房对比维度和租房看房清单，帮助你把找房信息留得住、比得清。',
  alternates: { canonical: '/guides' },
  openGraph: {
    title: '找房实用指南｜寻家 Find Home',
    description: '看房记录、房源对比与租房清单，帮助你做出更稳妥的买房租房决定。',
    url: '/guides',
    type: 'website',
  },
}

export default function GuidesIndexPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:py-16">
      <div className="mx-auto max-w-4xl">
        <nav className="mb-10 text-sm text-muted-foreground" aria-label="面包屑">
          <Link href="/" className="hover:text-primary">寻家</Link>
          <span className="mx-2">/</span>
          <span>找房指南</span>
        </nav>
        <header className="mb-10 max-w-2xl">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-primary">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            找房实用指南
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">把看房信息记下来，再做决定</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">从看房记录到候选房对比，整理一些真正能在买房租房现场派上用场的方法。</p>
        </header>
        <div className="grid gap-5 md:grid-cols-3">
          {guides.map((guide) => (
            <article key={guide.slug} className="flex flex-col border border-border bg-card p-5 shadow-sm">
              <h2 className="text-lg font-semibold leading-7">{guide.title}</h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{guide.description}</p>
              <Link href={`/guides/${guide.slug}`} className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                阅读指南 <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
        <div className="mt-12 border-t border-border pt-8">
          <p className="text-sm leading-6 text-muted-foreground">想把自己的候选房放在一起比较？</p>
          <Link href="/" className="mt-2 inline-flex items-center gap-1 font-medium text-primary hover:underline">
            打开寻家房源对比工具 <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </main>
  )
}
