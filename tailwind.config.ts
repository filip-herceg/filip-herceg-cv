import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1280px' } },
    extend: {},
  },
  plugins: [require('tailwindcss-animate')],
}
export default config
