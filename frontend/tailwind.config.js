/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f1117',
        card: '#1a1d2e',
        border: '#2a2d3e',
        muted: '#6b7280',
      },
    },
  },
  plugins: [],
};
