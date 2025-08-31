// Centralized literals & magic numbers to reduce duplication.

// PDF Generation
export const PDF_DEFAULT_TIMEOUT_MS = 20_000
export const PDF_NAVIGATION_GRACE_MS = 2_000
export const PDF_POST_RENDER_DELAY_MS = 300
export const PDF_CACHE_TTL_MS = 60_000 // matches aggregate cache TTL intention
export const CHROMIUM_CANDIDATE_PATHS = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'
]

// CV Layout defaults
export const CV_PAGE_SIZE = 'A4'
export const CV_PAGE_MARGIN = '16mm'
export const CV_PAGE_GUTTER = '8mm'
export const CV_PAGE_COLUMNS = 2

// Rate limiter / session (if later needed) could be added here.
