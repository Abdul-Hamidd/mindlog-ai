/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#232821',
        paper: '#FAF7F2',
        paperLine: '#E6E0D6',
        accent: '#5B7A63',
        accentSoft: '#E8EFE7',
        inkSoft: '#6B6862',
        alert: '#B4432C',
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}