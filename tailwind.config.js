/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cvc: {
          navy: '#0F172A',
          blue: '#1E3A8A',
          accent: '#2563EB',
          sky: '#0284C7',
          gold: '#D97706',
          amber: '#F59E0B',
          emerald: '#059669',
          crimson: '#DC2626',
          slate: '#475569',
        },
        pocr: {
          aligned: '#10B981',
          alignedBg: '#ECFDF5',
          alignedBorder: '#A7F3D0',
          approaching: '#F59E0B',
          approachingBg: '#FFFBEB',
          approachingBorder: '#FDE68A',
          incomplete: '#EF4444',
          incompleteBg: '#FEF2F2',
          incompleteBorder: '#FCA5A5',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
