import type { MetadataRoute } from 'next';
import { buildSitemapEntries } from '@/lib/seo/sitemap';

export default function sitemap(): MetadataRoute.Sitemap {
  return buildSitemapEntries().map(e => ({
    url: e.url,
    lastModified: e.lastModified,
    alternates: e.alternates,
    changeFrequency: e.changeFrequency as any,
    priority: e.priority
  }));
}
