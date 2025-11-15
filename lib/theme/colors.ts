// Bubbles Creative Learning Theme
// Calming pastel green and deep blue palette for focus and learning

export const theme = {
  // Background colors - Deep blues with subtle gradients
  bg: {
    primary: '#0a1628',      // Deep navy blue
    secondary: '#0f1e2e',    // Slightly lighter blue
    tertiary: '#1a2942',     // Card/panel background
    elevated: '#1e3a5f',     // Elevated elements
    canvas: 'linear-gradient(135deg, #0a1628 0%, #0d1b2a 50%, #0f1e2e 100%)',
  },
  
  // Text colors - High contrast for readability
  text: {
    primary: '#f0fdf4',      // Almost white with green tint
    secondary: '#d1fae5',    // Light pastel green
    tertiary: '#a7f3d0',     // Medium pastel green
    muted: '#6ee7b7',        // Muted green
    disabled: '#4b6b7f',     // Disabled state
  },
  
  // Accent colors - Calming greens and blues
  accent: {
    primary: '#34d399',      // Pastel green - growth, learning
    secondary: '#10b981',    // Emerald green - success
    tertiary: '#3b82f6',     // Blue - trust, clarity
    success: '#10b981',      // Green - achievement
    warning: '#fbbf24',      // Yellow - attention
    error: '#ef4444',        // Red - errors
  },
  
  // Border colors
  border: {
    default: '#1e3a5f',      // Subtle blue border
    hover: '#10b981',        // Green on hover
    focus: '#34d399',        // Pastel green on focus
    accent: '#6ee7b7',       // Accent border
  },
  
  // Interactive states
  interactive: {
    hover: 'rgba(16, 185, 129, 0.2)',
    active: 'rgba(52, 211, 153, 0.3)',
    disabled: 'rgba(75, 107, 127, 0.3)',
  },
  
  // Gradients for visual interest
  gradients: {
    primary: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    secondary: 'linear-gradient(135deg, #34d399 0%, #6ee7b7 100%)',
    accent: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
    node: 'linear-gradient(135deg, #1a2942 0%, #1e3a5f 100%)',
  },
  
  // Shadows for depth
  shadows: {
    sm: '0 2px 8px rgba(16, 185, 129, 0.1)',
    md: '0 4px 16px rgba(16, 185, 129, 0.15)',
    lg: '0 8px 32px rgba(16, 185, 129, 0.2)',
    xl: '0 12px 48px rgba(16, 185, 129, 0.25)',
    glow: '0 0 20px rgba(52, 211, 153, 0.4)',
  },
};

export type Theme = typeof theme;
