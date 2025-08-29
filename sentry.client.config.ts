// Optional Sentry client init; dynamic import keeps it out of bundle if unused.
// eslint-disable-next-line @typescript-eslint/no-floating-promises
import('@sentry/nextjs').then((mod) => {
  // mod is the namespace export; treat as any to avoid hard dep types at build if not installed
  const Sentry = mod as { init?: (cfg: Record<string, unknown>) => void }
  if (typeof Sentry.init !== 'function') return
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    replaysSessionSampleRate: Number(process.env.SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? 0),
    replaysOnErrorSampleRate: Number(process.env.SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? 0.5),
    release: process.env.NEXT_PUBLIC_RELEASE || process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA,
    environment: process.env.NEXT_PUBLIC_ENV || process.env.NODE_ENV,
  })
}).catch(() => { /* optional */ })
