/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // NOTE: Intentional LACK of Indic font configuration here
      // to demonstrate font-stack violation detection.
    },
  },
  plugins: [],
};
