/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts,css}',
    './index.html'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#04120a',
        neon: '#00ff6a',
        accent: '#ff7a10',
        gold: '#ffd700'
      },
      dropShadow: {
        neon: ['0 0 10px rgba(0,255,106,0.85)', '0 0 28px rgba(0,255,106,0.45)', '0 0 60px rgba(0,255,106,0.2)'],
      },
      boxShadow: {
        neonStrong: '0 0 16px rgba(0,255,106,1), 0 0 48px rgba(0,255,106,0.5)'
      },
      fontFamily: {
        arcade: ['ArcadePixel', 'Press Start 2P', 'Courier New', 'monospace'],
      },
      keyframes: {
        glow: {
          '0%': { filter: 'brightness(0.8)' },
          '50%': { filter: 'brightness(1.1)' },
          '100%': { filter: 'brightness(0.9)' }
        }
      },
      animation: {
        glow: 'glow 1.2s infinite'
      }
    }
  },
  plugins: []
};
