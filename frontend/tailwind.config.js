/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        honey: '#8CE2D0',
        ember: '#C47978',
        coal: '#0f0f0f',
      },
      fontFamily: {
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft-card': '0 10px 50px rgba(0, 0, 0, 0.35)',
      },
      backgroundImage: {
        honeycomb:
          'linear-gradient(120deg, rgba(140, 226, 208, 0.08) 1px, transparent 1px), linear-gradient(60deg, rgba(140, 226, 208, 0.05) 1px, transparent 1px)',
      },
      keyframes: {
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        }
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.3s ease-out'
      }
    },
  },
  plugins: [],
}
