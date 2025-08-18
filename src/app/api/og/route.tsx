import { ImageResponse } from 'next/og'
export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div style={{
        fontFamily: 'Inter, system-ui, Arial',
        fontSize: 64,
        background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #ec4899 100%)',
        color: 'white',
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        letterSpacing: '-0.02em',
        textShadow: '0 2px 20px rgba(0,0,0,0.3)'
      }}>
        Filip Herceg · Portfolio
      </div>
    ),
  { width: 1200, height: 630 }
  )
}
