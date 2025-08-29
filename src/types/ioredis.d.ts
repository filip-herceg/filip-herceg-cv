// Temporary ambient module to satisfy optional redis import resolution during refactor steps 5-8.
declare module 'ioredis' {
  // Minimal subset of ioredis used; keeps optional dependency lightweight without 'any'.
  interface RedisLikeMinimal {
    incr(key: string): Promise<number>
    pexpire(key: string, ms: number): Promise<number | unknown>
    del(key: string): Promise<number | unknown>
    // Allow index signature for un-used methods to avoid type errors if accessed conditionally
    [k: string]: unknown
  }
  const Redis: {
    new (...args: unknown[]): RedisLikeMinimal
    (...args: unknown[]): RedisLikeMinimal
  }
  export = Redis
  export default Redis
}
