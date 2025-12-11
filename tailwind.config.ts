import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      colors: {
        /* SEMANTIC COLOR SYSTEM */
        
        // Depth layers - for backgrounds
        // Note: Using 'app-base' instead of 'base' to avoid collision with Tailwind's text-base font-size utility
        void: 'hsl(var(--void))',
        'app-base': 'hsl(var(--base))',
        surface: 'hsl(var(--surface))',
        elevated: 'hsl(var(--elevated))',
        overlay: 'hsl(var(--overlay))',
        
        // Text hierarchy
        'text-primary': 'hsl(var(--text-primary))',
        'text-secondary': 'hsl(var(--text-secondary))',
        'text-tertiary': 'hsl(var(--text-tertiary))',
        'text-disabled': 'hsl(var(--text-disabled))',
        
        // Borders
        'border-subtle': 'hsl(var(--border-subtle))',
        'border-default': 'hsl(var(--border-default))',
        'border-strong': 'hsl(var(--border-strong))',
        'border-focus': 'hsl(var(--border-focus))',
        
        // Actions
        'action-primary': 'hsl(var(--action-primary))',
        'action-primary-hover': 'hsl(var(--action-primary-hover))',
        'action-primary-text': 'hsl(var(--action-primary-text))',
        'action-subtle-bg': 'hsl(var(--action-subtle-bg))',
        'action-subtle-hover': 'hsl(var(--action-subtle-hover))',
        'action-subtle-text': 'hsl(var(--action-subtle-text))',
        'action-ghost-hover': 'hsl(var(--action-ghost-hover))',
        'action-ghost-text': 'hsl(var(--action-ghost-text))',
        
        // Semantic
        success: 'hsl(var(--success))',
        'success-muted': 'hsl(var(--success-muted))',
        warning: 'hsl(var(--warning))',
        'warning-muted': 'hsl(var(--warning-muted))',
        error: 'hsl(var(--error))',
        'error-muted': 'hsl(var(--error-muted))',
        info: 'hsl(var(--info))',
        'info-muted': 'hsl(var(--info-muted))',
        
        // Content
        'user-question': 'hsl(var(--user-question))',
        'ai-response': 'hsl(var(--ai-response))',
        
        // Legacy shadcn compatibility
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      boxShadow: {
        'depth-sm': '0 2px 8px hsla(var(--void), 0.3)',
        'depth-md': '0 4px 16px hsla(var(--void), 0.4)',
        'depth-lg': '0 8px 32px hsla(var(--void), 0.5)',
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
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
