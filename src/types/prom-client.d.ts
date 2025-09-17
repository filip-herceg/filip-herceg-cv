declare module 'prom-client' {
  export interface RegistryOptions { register?: Registry }
  export class Registry {
    constructor();
    setDefaultLabels(labels: Record<string,string>): void;
    metrics(): Promise<string> | string;
  }
  export interface CollectDefaultMetricsConfig { register?: Registry }
  export function collectDefaultMetrics(config?: CollectDefaultMetricsConfig): void;
  export interface CounterConfiguration<T extends string = string> { name: string; help: string; labelNames?: readonly T[]; registers?: Registry[] }
  export class Counter<T extends string = string> {
    constructor(cfg: CounterConfiguration<T>);
    inc(labels?: Partial<Record<T,string>> | number, value?: number): void;
    inc(value: number): void;
  }
  export interface GaugeConfiguration<T extends string = string> { name: string; help: string; labelNames?: readonly T[]; registers?: Registry[] }
  export class Gauge<T extends string = string> {
    constructor(cfg: GaugeConfiguration<T>);
  set(value: number): void;
  set(labels: Partial<Record<T,string>>, value: number): void;
  labels(...labelValues: string[]): { set(value: number): void; inc?(value?: number): void; dec?(value?: number): void };
    inc(value?: number): void;
    dec(value?: number): void;
  }
  const _default: {
    Registry: typeof Registry;
    collectDefaultMetrics: typeof collectDefaultMetrics;
    Counter: typeof Counter;
    Gauge: typeof Gauge;
  }
  export default _default;
}
