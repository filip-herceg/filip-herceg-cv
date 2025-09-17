/* eslint-disable */
// Ambient declarations for optional runtime-only modules used via dynamic import
// They are present in dependencies, but this guards build tools complaining in isolated type contexts.
declare module 'redis' {
  interface RedisClientOptions { url?: string }
  interface RedisScanResult { cursor: string; keys: string[] }
  interface RedisClient {
    get(key: string): Promise<string | null>
    set(key: string, value: string, opts?: { EX?: number }): Promise<void>
    del(...keys: string[]): Promise<number>
    scan(cursor: string, opts: { MATCH?: string; COUNT?: number }): Promise<RedisScanResult>
    on(event: string, listener: (...args: unknown[]) => void): void
    connect(): Promise<void>
    quit(): Promise<void>
  }
  export function createClient(opts: RedisClientOptions): RedisClient
}

// Optional QR code library used at runtime in Node only
declare module 'qrcode' {
  const _default: {
    toBuffer: (text: string, cfg?: { errorCorrectionLevel?: 'L'|'M'|'Q'|'H'; margin?: number; width?: number; color?: { dark?: string; light?: string } }) => Promise<Buffer>
  }
  export default _default
}

// S3 client (lightweight shape sufficient for our dynamic usage)
declare module '@aws-sdk/client-s3' {
  export class S3Client { constructor(cfg: Record<string, unknown>); send<T = unknown>(cmd: unknown): Promise<T> }
  export class GetObjectCommand { constructor(input: Record<string, unknown>) }
  export class PutObjectCommand { constructor(input: Record<string, unknown>) }
  export class ListObjectsV2Command { constructor(input: Record<string, unknown>) }
  export class DeleteObjectsCommand { constructor(input: Record<string, unknown>) }
  export class DeleteObjectCommand { constructor(input: Record<string, unknown>) }
}