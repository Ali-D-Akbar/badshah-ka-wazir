/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#FFD700',
      },
      fontFamily: {
        urdu: ['Noto Nastaliq Urdu', 'serif'],
      }
    }
  },
  plugins: []
};
