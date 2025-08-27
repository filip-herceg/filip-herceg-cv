// Temporary lightweight stub of prom-client to unblock typechecking.
export class Registry {
  private labels: Record<string,string> = {}
  setDefaultLabels(l: Record<string,string>) { this.labels = { ...this.labels, ...l } }
  async metrics() { return '# HELP stub Stub metrics\n# TYPE stub counter\nstub_total 0\n' }
}
export function collectDefaultMetrics(_: { register?: Registry } = {}) { /* no-op */ }
export class Counter<T extends string = string> {
  constructor(public cfg: { name: string; help: string; labelNames?: readonly T[]; registers?: Registry[] }) {}
  inc(_labelsOrValue?: any, _value?: number) { /* no-op */ }
}
export class Gauge<T extends string = string> {
  constructor(public cfg: { name: string; help: string; labelNames?: readonly T[]; registers?: Registry[] }) {}
  set(_value: number) { /* no-op */ }
  inc(_value?: number) { /* no-op */ }
  dec(_value?: number) { /* no-op */ }
}
