/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        // Fuente principal: Source Sans Pro (similar a Toyota)
        sans: ['Source Sans Pro', 'Arial', 'Helvetica Neue', 'sans-serif'],
        // Fuente para títulos y elementos destacados: Montserrat
        display: ['Montserrat', 'Source Sans Pro', 'Arial', 'sans-serif'],
        // Fuente monoespaciada (para códigos, etc.)
        mono: ['Courier New', 'monospace'],
      },
      colors: {
        toyota: {
          red: '#EB0A1E',
          'red-dark': '#C00818',
          'red-light': '#FF1A2E',
          gray: '#58595B',
          'gray-light': '#E5E5E5',
          'gray-dark': '#2C2C2C',
        },
      },
    },
  },
  plugins: [],
}

