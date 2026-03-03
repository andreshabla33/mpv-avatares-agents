/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Mission Control Theme Colors
        'dark-primary': '#050508',
        'dark-secondary': '#0a0a14',
        'dark-tertiary': '#1a1a2e',
        'dark-accent': '#2a2a4e',
        'cyber-cyan': '#4ecdc4',
        'cyber-purple': '#a29bfe',
        'cyber-orange': '#e67e22',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
