// Optional Sentry server init; only runs if @sentry/nextjs is available.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Sentry = require('@sentry/nextjs') as { init?: (cfg: unknown) => void }
  Sentry.init?.({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    release: process.env.RELEASE || process.env.GITHUB_SHA || process.env.VERCEL_GIT_COMMIT_SHA,
    environment: process.env.ENV || process.env.NODE_ENV,
  })
} catch {}
