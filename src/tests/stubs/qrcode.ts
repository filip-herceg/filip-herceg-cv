// Test stub for the 'qrcode' package to satisfy Vite import analysis in Vitest.
// Provides only the methods used by our code paths.
const qrcodeStub = {
  async toBuffer(_text: string, _opts?: unknown): Promise<Uint8Array> {
    // Return tiny PNG-like bytes
    return new Uint8Array([137, 80, 78, 71])
  },
}

export default qrcodeStub
