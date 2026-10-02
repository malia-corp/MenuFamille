import type { Config } from 'tailwindcss'
import tailwindAnimate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        dosis: ['var(--font-dosis)', 'sans-serif'],
        quicksand: ['var(--font-quicksand)', 'sans-serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        // Réactions de vote (sondage) — effet type WhatsApp
        'kkb-react-pop': {
          '0%':   { transform: 'scale(1) rotate(0deg)' },
          '25%':  { transform: 'scale(1.9) rotate(-12deg)' },
          '45%':  { transform: 'scale(0.85) rotate(8deg)' },
          '65%':  { transform: 'scale(1.2) rotate(-4deg)' },
          '100%': { transform: 'scale(1) rotate(0deg)' },
        },
        'kkb-react-float': {
          '0%':   { transform: 'translate(-50%, 0) scale(0.6)', opacity: '0' },
          '15%':  { transform: 'translate(-50%, -12px) scale(1.6)', opacity: '1' },
          '70%':  { transform: 'translate(-50%, -48px) scale(2.1)', opacity: '1' },
          '100%': { transform: 'translate(-50%, -64px) scale(2.3)', opacity: '0' },
        },
        'kkb-react-ring': {
          '0%':   { transform: 'scale(0.6)', opacity: '0.7' },
          '100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'kkb-react-particle': {
          '0%':   { transform: 'translate(-50%, -50%) translate(0, 0) scale(1)', opacity: '1' },
          '100%': { transform: 'translate(-50%, -50%) translate(var(--dx), var(--dy)) scale(0.2)', opacity: '0' },
        },
        'kkb-react-wiggle': {
          '0%, 100%': { transform: 'scale(1.25) rotate(0deg)' },
          '25%':      { transform: 'scale(1.3) rotate(-10deg)' },
          '75%':      { transform: 'scale(1.3) rotate(10deg)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'kkb-react-pop':      'kkb-react-pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'kkb-react-float':    'kkb-react-float 0.9s ease-out forwards',
        'kkb-react-ring':     'kkb-react-ring 0.5s ease-out forwards',
        'kkb-react-particle': 'kkb-react-particle 0.6s ease-out forwards',
        'kkb-react-wiggle':   'kkb-react-wiggle 0.6s ease-in-out infinite',
      },
    },
  },
  plugins: [tailwindAnimate],
}
export default config
