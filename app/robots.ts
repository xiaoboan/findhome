import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
    sitemap: 'https://findhome.xiaoboan.top/sitemap.xml',
    host: 'https://findhome.xiaoboan.top',
  }
}
