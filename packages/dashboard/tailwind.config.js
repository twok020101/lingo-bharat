/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bharat: {
          50: '#fef3e2',
          100: '#fde4b9',
          200: '#fbd58c',
          300: '#f9c55e',
          400: '#f7b940',
          500: '#f5ad23',
          600: '#f09f1e',
          700: '#e98c18',
          800: '#e27a12',
          900: '#d65c09',
        },
        score: {
          A: '#22c55e',
          B: '#84cc16',
          C: '#eab308',
          D: '#f97316',
          F: '#ef4444',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
