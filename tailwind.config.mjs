/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        burgundy: {
          50:  '#fdf2f4',
          100: '#fce7ea',
          200: '#f8d0d7',
          300: '#f2aab6',
          400: '#e87a90',
          500: '#d94e6b',
          600: '#c42f4f',
          700: '#a42040',
          800: '#7f1d34',  // primary brand
          900: '#5c1526',
          950: '#3d0c18',
        },
        gold: {
          50:  '#fffbea',
          100: '#fff3c4',
          200: '#ffe588',
          300: '#ffd14d',
          400: '#ffbc24',
          500: '#f59c00',  // primary gold
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        ink: {
          50:  '#f8f8f8',
          100: '#eeeeee',
          200: '#d4d4d4',
          300: '#a3a3a3',
          400: '#737373',
          500: '#525252',
          600: '#404040',
          700: '#262626',
          800: '#171717',
          900: '#0f0f0f',
          950: '#080808',
        },
      },
      fontFamily: {
        sans: ['"Inter"', '"system-ui"', 'sans-serif'],
        display: ['"Inter"', '"Georgia"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
        xs:   ['0.72rem', { lineHeight: '1.1rem' }],
        sm:   ['0.82rem', { lineHeight: '1.25rem' }],
        base: ['0.9rem',  { lineHeight: '1.4rem' }],
        lg:   ['1rem',    { lineHeight: '1.45rem' }],
        xl:   ['1.1rem',  { lineHeight: '1.45rem' }],
        '2xl':['1.25rem', { lineHeight: '1.4rem' }],
        '3xl':['1.5rem',  { lineHeight: '1.35rem' }],
      },
      spacing: {
        '0.5': '0.125rem',
        '1':   '0.25rem',
        '1.5': '0.375rem',
        '2':   '0.5rem',
        '2.5': '0.625rem',
        '3':   '0.75rem',
      },
      lineHeight: {
        tight: '1.2',
        snug:  '1.35',
        normal:'1.5',
      },
    },
  },
  plugins: [],
};
