import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geistSans = Geist({ 
  subsets: ["latin"],
  variable: '--font-geist-sans',
})

const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://findhome.xiaoboan.top'),
  title: '寻家 Find Home - 买房租房的房源整理与对比工具',
  description: '把贝壳、安居客和中介发来的候选房整理到一张表，支持截图识别、看房记录、房源对比和地图查看。',
  applicationName: '寻家 Find Home',
  keywords: ['买房', '租房', '看房记录', '房源对比', '房源整理', '买房工具', '租房工具'],
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: '/',
    siteName: '寻家 Find Home',
    title: '寻家 Find Home - 把候选房放进同一张表',
    description: '截图录入、看房记录、房源对比和地图查看，买房租房都能用。',
    images: [
      {
        url: '/icons/icon-512x512.png',
        width: 512,
        height: 512,
        alt: '寻家 Find Home',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: '寻家 Find Home - 把候选房放进同一张表',
    description: '截图录入、看房记录、房源对比和地图查看，买房租房都能用。',
    images: ['/icons/icon-512x512.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '寻家',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#e85d5d' },
    { media: '(prefers-color-scheme: dark)', color: '#d94f4f' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          themes={['light', 'minimal', 'dark']}
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
