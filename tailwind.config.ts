import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    { pattern: /(bg|text|border|border-l|ring)-(rose|sky|emerald|indigo|amber|orange|teal|purple|violet|fuchsia)-(50|100|200|300|400|500|600|700|800|900|950)/ },
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config
