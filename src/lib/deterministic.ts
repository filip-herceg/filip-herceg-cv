// Utilities to freeze time and Intl for deterministic SSR/PDF snapshots.
// Use only in server contexts.

type Restore = () => void

export function freezeNow(isoString?: string): Restore {
  const fixed = isoString ? new Date(isoString) : new Date('2024-01-01T00:00:00.000Z')
  // Freeze Date.now and new Date()
  const RealDate = Date
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FakeDate: any = function (...args: unknown[]) {
    if (new.target) {
      return args.length ? new RealDate(...(args as ConstructorParameters<typeof Date>)) : new RealDate(fixed)
    }
    // Called as function
    return RealDate(...(args as unknown as Parameters<typeof Date>))
  }
  FakeDate.UTC = RealDate.UTC
  FakeDate.parse = RealDate.parse
  FakeDate.now = () => fixed.getTime()
  FakeDate.prototype = RealDate.prototype
  ;(globalThis as unknown as { Date: unknown }).Date = FakeDate as unknown as DateConstructor

  // Freeze Intl.DateTimeFormat (options normalized)
  const RealDTF = Intl.DateTimeFormat
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const FakeDTF: any = function (locale?: string | string[], options?: Intl.DateTimeFormatOptions) {
    const stableOpts: Intl.DateTimeFormatOptions = { timeZone: 'UTC', ...(options || {}) }
    return new RealDTF(locale as never, stableOpts)
  }
  FakeDTF.supportedLocalesOf = RealDTF.supportedLocalesOf.bind(RealDTF)
  FakeDTF.prototype = RealDTF.prototype
  ;(Intl as unknown as { DateTimeFormat: unknown }).DateTimeFormat = FakeDTF

  return () => {
  ;(globalThis as unknown as { Date: unknown }).Date = RealDate
  ;(Intl as unknown as { DateTimeFormat: unknown }).DateTimeFormat = RealDTF
  }
}
