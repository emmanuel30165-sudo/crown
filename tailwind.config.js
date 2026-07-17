/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./products.html",
    "./colour-chart.html",
    "./about.html",
    "./**/*.html"
  ],
  theme: {
    extend: {
      colors: {
        crown: {
          navy: '#2b2a7c',
          'navy-dark': '#1f1e5c',
          red: '#d11f23',
          'red-dark': '#a8181b',
          gold: '#c9a24a',
          cream: '#fdfaf4',
        },
        text: {
          dark: '#1c1c1e',
          muted: '#5f6068',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        'sm': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'md': '0 8px 24px rgba(0, 0, 0, 0.10)',
        'lg': '0 16px 40px rgba(0, 0, 0, 0.14)',
      },
      borderRadius: {
        'DEFAULT': '14px',
        'sm': '8px',
      }
    },
  },
  plugins: [],
}
