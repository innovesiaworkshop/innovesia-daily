/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Innovesia brand palette (see CLAUDE.md)
        navy: '#1f52a5', // primary buttons, headers, active
        sky: '#14b4e8', // accents, links, secondary
        gold: '#ffce0f', // highlights, pending / needs-action badges
      },
    },
  },
  plugins: [],
}
