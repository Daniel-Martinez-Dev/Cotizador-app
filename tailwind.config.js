/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        negro: '#000000',
        gris: {
          950: '#050505',
          900: '#111111',
            800: '#1a1a1a',
          700: '#2a2a2a',
          600: '#3a3a3a',
          500: '#555555',
          400: '#777777'
        },
        trafico: '#FFD300'
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography')
  ],
}