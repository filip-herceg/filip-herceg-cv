import { describe, it, expect } from 'vitest';
import { buildSitemapEntries } from '@/lib/seo/sitemap';

describe('sitemap builder', () => {
  it('builds entries with alternates for de and x-default', () => {
    const date = new Date('2025-01-01T00:00:00.000Z');
    const entries = buildSitemapEntries({ siteUrl: 'https://example.com', lastModified: date });
    // root + 4 other pages
    expect(entries.length).toBeGreaterThanOrEqual(5);
    const root = entries.find(e => e.url === 'https://example.com');
    expect(root).toBeTruthy();
    expect(root?.alternates.languages.de).toBe('https://example.com/de');
    expect(root?.alternates.languages['x-default']).toBe('https://example.com');
    // ensure no trailing slash duplication
    for (const e of entries) {
      expect(e.url.endsWith('//')).toBe(false);
    }
  });
});
