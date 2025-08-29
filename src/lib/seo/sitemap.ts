// Utility to build sitemap entries with locale alternates
export interface SitemapPageDef {
  path: string; // without leading slash for non-root
  priority?: number;
}

export interface BuiltSitemapEntry {
  url: string;
  lastModified: Date;
  alternates: { languages: Record<string, string> };
  changeFrequency?: string;
  priority?: number;
}

const DEFAULT_PAGES: SitemapPageDef[] = [
  { path: '' },
  { path: 'about' },
  { path: 'projects' },
  { path: 'contact' },
  { path: 'site' }
];

export function buildSitemapEntries(options?: {
  siteUrl?: string;
  pages?: SitemapPageDef[];
  locales?: string[]; // first is default
  lastModified?: Date;
}): BuiltSitemapEntry[] {
  const siteUrl = (options?.siteUrl || process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const pages = options?.pages || DEFAULT_PAGES;
  const locales = options?.locales || ['en', 'de'];
  const date = options?.lastModified || new Date();

  return pages.map(p => {
    const suffix = p.path ? `/${p.path}` : '';
    const canonicalUrl = `${siteUrl}${suffix}`;
    const languages: Record<string, string> = {};
    for (const locale of locales.slice(1)) {
      languages[locale] = `${siteUrl}/${locale}${suffix}`;
    }
    // x-default points to default locale canonical URL
    languages['x-default'] = canonicalUrl;
    return {
      url: canonicalUrl,
      lastModified: date,
      alternates: { languages },
      changeFrequency: 'weekly',
      priority: p.priority
    };
  });
}

export const _internal = { DEFAULT_PAGES };
