// Centralized literals & magic numbers to reduce duplication.

// PDF Generation
export const PDF_DEFAULT_TIMEOUT_MS = 20_000
export const PDF_NAVIGATION_GRACE_MS = 2_000
export const PDF_POST_RENDER_DELAY_MS = 300
export const PDF_CACHE_TTL_MS = 60_000 // matches aggregate cache TTL intention
// SLA guardrail: max wait for pooled page before failing fast with 503
export const PDF_POOL_ACQUIRE_SLA_MS = 200
export const PDF_RETRY_AFTER_SECONDS = 1
// Logical cache key version for PDF/export artifacts (used in cache key composition and metrics)
export const PDF_CACHE_KEY_VERSION = 'v2'
export const CHROMIUM_CANDIDATE_PATHS = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  // Windows Chrome/Chromium/Edge executables
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files/Chromium/Application/chrome.exe',
  'C:/Program Files (x86)/Chromium/Application/chrome.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
]

// CV Layout defaults
export const CV_PAGE_SIZE = 'A4'
export const CV_PAGE_MARGIN = '16mm'
export const CV_PAGE_GUTTER = '8mm'
export const CV_PAGE_COLUMNS = 2

// Feature flags
export const FEATURE_EXPORT_ENABLED = (process.env.EXPORT_ENABLED || 'false').toLowerCase() === 'true'

// Rate limiter / session (if later needed) could be added here.
