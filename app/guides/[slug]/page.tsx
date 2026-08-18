import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getGuide, guides } from '../content'

export function generateStaticParams() {
  return guides.map((guide) => ({ slug: guide.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) return {}

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: `${guide.title}｜寻家 Find Home`,
      description: guide.description,
      url: `/guides/${guide.slug}`,
      type: 'article',
      publishedTime: guide.updatedAt,
      modifiedTime: guide.updatedAt,
    },
  }
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const guide = getGuide(slug)
  if (!guide) notFound()

  const articleUrl = `https://findhome.xiaoboan.top/guides/${guide.slug}`
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    dateModified: guide.updatedAt,
    datePublished: guide.updatedAt,
    mainEntityOfPage: articleUrl,
    inLanguage: 'zh-CN',
    author: { '@type': 'Organization', name: '寻家 Find Home', url: 'https://findhome.xiaoboan.top' },
    publisher: { '@type': 'Organization', name: '寻家 Find Home', url: 'https://findhome.xiaoboan.top' },
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <article className="mx-auto max-w-3xl">
        <nav className="mb-10 flex items-center gap-2 text-sm text-muted-foreground" aria-label="面包屑">
          <Link href="/" className="hover:text-primary">寻家</Link>
          <span>/</span>
          <Link href="/guides" className="hover:text-primary">找房指南</Link>
          <span>/</span>
          <span className="truncate">{guide.title}</span>
        </nav>
        <header className="border-b border-border pb-8">
          <p className="text-sm font-medium text-primary">寻家找房指南</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{guide.title}</h1>
          <p className="mt-4 text-base leading-7 text-muted-foreground">{guide.intro}</p>
          <p className="mt-4 text-xs text-muted-foreground">更新于 {guide.updatedAt}</p>
        </header>
        <div className="prose prose-neutral mt-8 max-w-none dark:prose-invert">
          {guide.sections.map((section) => (
            <section key={section.heading} className="mb-9">
              <h2 className="text-xl font-semibold">{section.heading}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets && (
                <ul>
                  {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                </ul>
              )}
            </section>
          ))}
        </div>
        <aside className="mt-10 border border-primary/30 bg-primary/5 p-6">
          <h2 className="text-lg font-semibold">把候选房真正放在一起比较</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">截图、链接、看房照片和现场备注可以集中到一张候选房表里，再并排比较 2 到 3 套房。</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            免费打开寻家 <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </aside>
        <Link href="/guides" className="mt-10 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          返回找房指南
        </Link>
      </article>
    </main>
  )
}
