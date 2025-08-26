import type { CvData, Experience, Project, Education, Certification, Skill } from './types'

export interface SearchDoc {
  kind: SearchKind
  id: string
  title: string
  terms: string[]
  boost: number
  facets: Record<string, string | number | undefined>
  raw: any
  periodSort?: number // derived recency sort (epoch ms or year)
}
export type SearchKind = 'skill' | 'project' | 'experience' | 'education' | 'certification'

export interface SearchFilters {
  kinds?: SearchKind[]
  category?: string
  employmentType?: string
  issuer?: string
  institution?: string
  year?: number | { gte?: number; lte?: number }
}
export interface SearchResultItem { kind: SearchKind; id: string; title: string; score: number; snippet?: string }
export interface SearchResponse {
  query: string
  tokens: string[]
  results: SearchResultItem[]
  total: number
  facets: {
    category: Record<string, number>
    employmentType: Record<string, number>
    issuer: Record<string, number>
    institution: Record<string, number>
    year: Record<string, number>
  }
}

const KIND_BOOST: Record<SearchKind, number> = {
  project: 3.0,
  experience: 2.5,
  skill: 2.0,
  education: 1.5,
  certification: 1.25
}

const SPLIT_RE = /[^a-z0-9]+/i
function tokenize(text: string | undefined): string[] {
  if (!text) return []
  const tokens = text
    .toLowerCase()
    .split(SPLIT_RE)
    .filter(Boolean)
    .filter(t => t.length > 1 || /^\d+$/.test(t))
  return Array.from(new Set(tokens))
}

function firstSentence(str?: string) {
  if (!str) return undefined
  const s = str.split(/\.(\s|$)/)[0]?.trim()
  return s?.length ? s : undefined
}

export function buildIndex(data: CvData): SearchDoc[] {
  const docs: SearchDoc[] = []
  const now = Date.now()

  const push = (doc: Omit<SearchDoc, 'terms'> & { text: string[] }) => {
    const terms = tokenize(doc.text.join(' '))
    docs.push({ ...doc, terms })
  }

  const skills = data.skills as Skill[]
  for (const s of skills) {
    push({ kind: 'skill', id: s.id, title: s.name, boost: KIND_BOOST.skill, raw: s, facets: { category: s.category }, text: [s.name, s.tags?.join(' ') || ''] })
  }

  const projects = data.projects as Project[]
  for (const p of projects) {
    push({ kind: 'project', id: p.id, title: p.title, boost: KIND_BOOST.project, raw: p, facets: {}, text: [p.title, p.summary, p.highlights.join(' '), p.stack.join(' '), p.impact || ''] })
  }

  const experiences = data.experiences || []
  for (const e of experiences as Experience[]) {
    const achievements = e.achievements?.map(a => a.summary + ' ' + (a.impact || '')).join(' ') || ''
    const periodSort = derivePeriodSort(e.period, now)
    push({ kind: 'experience', id: e.id, title: e.role, boost: KIND_BOOST.experience, raw: e, facets: { employmentType: e.employmentType }, periodSort, text: [e.role, e.company, e.summary || '', achievements, (e.stack || []).join(' ')] })
  }

  const education = data.education || []
  for (const ed of education as Education[]) {
    const periodSort = derivePeriodSort(ed.period, now)
    push({ kind: 'education', id: ed.id, title: ed.degree, boost: KIND_BOOST.education, raw: ed, facets: { institution: ed.institution }, periodSort, text: [ed.degree, ed.institution, (ed.highlights || []).join(' '), ed.summary || ''] })
  }

  const certs = data.certifications || []
  for (const c of certs as Certification[]) {
    push({ kind: 'certification', id: c.id, title: c.name, boost: KIND_BOOST.certification, raw: c, facets: { issuer: c.issuer, year: c.year }, text: [c.name, c.issuer, String(c.year || '')] })
  }

  return docs
}

function derivePeriodSort(period: string, fallback: number): number | undefined {
  // Expect formats like '2023 – 2024' or '2022 – Present' or single '2024'
  const yearMatch = period.match(/(19|20)\d{2}/g)
  if (!yearMatch || !yearMatch.length) return undefined
  const lastYear = parseInt(yearMatch[yearMatch.length - 1], 10)
  return new Date(lastYear, 11, 31).getTime() || fallback
}

function matchAndScore(doc: SearchDoc, tokens: string[]): { matched: boolean; score: number; titleHit: boolean; narrativeHit: boolean; stackHit: boolean } {
  if (!tokens.length) return { matched: true, score: doc.boost, titleHit: false, narrativeHit: false, stackHit: false }
  let score = 0
  let titleHit = false
  let narrativeHit = false
  let stackHit = false
  for (const qt of tokens) {
    let tokenMatched = false
    for (const dt of doc.terms) {
      if (dt === qt) { score += 1; tokenMatched = true; break }
      if (dt.startsWith(qt)) { score += 0.5; tokenMatched = true; break }
    }
    if (!tokenMatched) return { matched: false, score: 0, titleHit, narrativeHit, stackHit }
  }
  // Field bonuses (heuristic via raw)
  const raw = doc.raw as any
  if (raw.title || raw.name || raw.role) {
    const titleStr = (raw.title || raw.name || raw.role || '').toLowerCase()
    if (tokens.some(t => titleStr.includes(t))) { score += 1; titleHit = true }
  }
  if (raw.summary || raw.highlights || raw.achievements) {
    const narrative = [raw.summary, ...(raw.highlights || []), ...(raw.achievements?.map((a: any) => a.summary) || [])].join(' ').toLowerCase()
    if (tokens.some(t => narrative.includes(t))) { score += 0.75; narrativeHit = true }
  }
  if (raw.stack || raw.tags) {
    const stack = [...(raw.stack || []), ...(raw.tags || [])].join(' ').toLowerCase()
    if (tokens.some(t => stack.includes(t))) { score += 0.5; stackHit = true }
  }
  score *= doc.boost
  return { matched: true, score, titleHit, narrativeHit, stackHit }
}

export interface SearchOptions { limit?: number; filters?: SearchFilters }

export function search(index: SearchDoc[], query: string, opts: SearchOptions = {}): SearchResponse {
  const tokens = tokenize(query)
  const limit = opts.limit ?? 20
  const filters = opts.filters || {}

  const yearFilter = filters.year
  const yearRange = typeof yearFilter === 'object' && yearFilter !== null && !('toString' in yearFilter)
    ? yearFilter as { gte?: number; lte?: number }
    : undefined

  const results: { doc: SearchDoc; score: number }[] = []
  for (const doc of index) {
    if (filters.kinds && !filters.kinds.includes(doc.kind)) continue
    if (filters.category && doc.facets.category !== filters.category) continue
    if (filters.employmentType && doc.facets.employmentType !== filters.employmentType) continue
    if (filters.issuer && doc.facets.issuer !== filters.issuer) continue
    if (filters.institution && doc.facets.institution !== filters.institution) continue
    if (typeof yearFilter === 'number' && doc.facets.year !== yearFilter) continue
    if (yearRange) {
      const y = doc.facets.year as number | undefined
      if (y !== undefined) {
        if (yearRange.gte !== undefined && y < yearRange.gte) continue
        if (yearRange.lte !== undefined && y > yearRange.lte) continue
      }
    }

    const { matched, score } = matchAndScore(doc, tokens)
    if (!matched) continue
    results.push({ doc, score })
  }

  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const ap = a.doc.periodSort || 0
    const bp = b.doc.periodSort || 0
    if (bp !== ap) return bp - ap
    return a.doc.id.localeCompare(b.doc.id)
  })

  const sliced = results.slice(0, limit)
  const response: SearchResponse = {
    query,
    tokens,
    total: results.length,
    results: sliced.map(r => ({ kind: r.doc.kind, id: r.doc.id, title: r.doc.title, score: Number(r.score.toFixed(3)), snippet: buildSnippet(r.doc, tokens) })),
    facets: buildFacets(results.map(r => r.doc))
  }
  return response
}

function buildSnippet(doc: SearchDoc, tokens: string[]): string | undefined {
  if (doc.kind === 'skill' || doc.kind === 'certification') return undefined
  const raw = doc.raw as any
  const parts: string[] = []
  if (raw.summary) parts.push(firstSentence(raw.summary) || '')
  if (!parts.length && raw.achievements?.length) parts.push(firstSentence(raw.achievements[0].summary) || '')
  if (!parts.length && raw.highlights?.length) parts.push(firstSentence(raw.highlights[0]) || '')
  const snippet = parts.join(' ').trim().slice(0, 160)
  if (!snippet.length) return undefined
  return snippet
}

function buildFacets(docs: SearchDoc[]): SearchResponse['facets'] {
  const aggregators = { category: {}, employmentType: {}, issuer: {}, institution: {}, year: {} } as any
  for (const d of docs) {
    for (const key of Object.keys(aggregators)) {
      const val = d.facets[key]
      if (val === undefined) continue
      const k = String(val)
      aggregators[key][k] = (aggregators[key][k] || 0) + 1
    }
  }
  return aggregators
}

export function emptySearchResponse(): SearchResponse {
  return { query: '', tokens: [], results: [], total: 0, facets: { category: {}, employmentType: {}, issuer: {}, institution: {}, year: {} } }
}
