/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./paginas/**/*.html",
    "./dist/js/components/*.js", // VITAL para que lea el MenuComponent.js
  ],
  theme: {
    extend: {
      colors: {
        green_one: '#10b981',
        black_one: '#1a1a1a',
        red_one: '#ef4444',
      },
      fontFamily: {
        lato: ['Lato', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

