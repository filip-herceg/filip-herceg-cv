import * as Sentry from '@sentry/nextjs'
// Type assertion to satisfy TS when optional chaining on init in edge bundle
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _sentry = Sentry as any

// Edge runtime Sentry init (optional)
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  _sentry.init?.({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: true,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
  })
}
