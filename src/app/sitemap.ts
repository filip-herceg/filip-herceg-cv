import type { MetadataRoute } from 'next';
import { buildSitemapEntries, type BuiltSitemapEntry } from '@/lib/seo/sitemap';

export default function sitemap(): MetadataRoute.Sitemap {
  // buildSitemapEntries already returns changeFrequency as string | undefined which
  // aligns with MetadataRoute.SitemapEntry['changeFrequency'] (string union) – narrow via cast.
  return buildSitemapEntries().map((e: BuiltSitemapEntry) => ({
    url: e.url,
    lastModified: e.lastModified,
    alternates: e.alternates,
    changeFrequency: e.changeFrequency as MetadataRoute.Sitemap[number]['changeFrequency'],
    priority: e.priority
  }));
}
