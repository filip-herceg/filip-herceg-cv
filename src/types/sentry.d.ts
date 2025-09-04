declare module '@sentry/nextjs' {
  // Minimal surface needed by this app; extend as required (keeps build lean without pulling full types)
  export interface InitOptions {
    dsn?: string
    enabled?: boolean
    environment?: string
    tracesSampleRate?: number
    profilesSampleRate?: number
    replaysSessionSampleRate?: number
    replaysOnErrorSampleRate?: number
    integrations?: unknown[]
  }
  export function init(opts: InitOptions): void
  export function rewriteFramesIntegration(opts: { root: string }): unknown
}
