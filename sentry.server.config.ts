// Optional Sentry server init; only runs if @sentry/nextjs is available.
import * as Sentry from '@sentry/nextjs'
import { RewriteFrames } from '@sentry/integrations'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _sentry = Sentry as any
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  _sentry.init?.({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    enabled: true,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      new RewriteFrames({
        root: global.process.cwd(),
      }),
    ],
  })
}
