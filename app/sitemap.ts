import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const guideUrls = [
    'https://findhome.xiaoboan.top/guides',
    'https://findhome.xiaoboan.top/guides/kanfang-jilu-biao',
    'https://findhome.xiaoboan.top/guides/fangyuan-duibi',
    'https://findhome.xiaoboan.top/guides/zufang-kanfang-qingdan',
  ]

  return [
    {
      url: 'https://findhome.xiaoboan.top/',
      lastModified: new Date('2026-08-18'),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...guideUrls.map((url) => ({
      url,
      lastModified: new Date('2026-08-18'),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
