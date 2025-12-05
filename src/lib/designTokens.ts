/**
 * AgentBuddy Design System Tokens
 * Centralized design tokens for consistent styling across the application
 * 
 * Usage:
 * - Import tokens where programmatic access to design values is needed
 * - For CSS, use the CSS custom properties defined in index.css
 * - For Tailwind classes, use the extended theme in tailwind.config.ts
 */

// ============================================
// COLOR PALETTE
// ============================================

export const colors = {
  // Primary: Teal → Cyan gradient
  primary: {
    DEFAULT: "hsl(174, 62%, 47%)",   // #0D9488
    light: "hsl(187, 78%, 42%)",     // #06B6D4
    dark: "hsl(174, 62%, 38%)",
    foreground: "hsl(0, 0%, 100%)",
  },
  
  // Accent: Amber → Gold gradient
  accent: {
    DEFAULT: "hsl(38, 92%, 50%)",    // #F59E0B
    light: "hsl(45, 93%, 58%)",      // #FBBF24
    foreground: "hsl(0, 0%, 9%)",
  },
  
  // Semantic colors
  success: {
    DEFAULT: "hsl(160, 84%, 39%)",   // #059669
    light: "hsl(152, 76%, 95%)",
    foreground: "hsl(0, 0%, 100%)",
  },
  warning: {
    DEFAULT: "hsl(45, 93%, 47%)",    // #EAB308
    light: "hsl(48, 96%, 95%)",
    foreground: "hsl(0, 0%, 9%)",
  },
  danger: {
    DEFAULT: "hsl(0, 84%, 60%)",     // #EF4444
    light: "hsl(0, 86%, 97%)",
    foreground: "hsl(0, 0%, 100%)",
  },
  info: {
    DEFAULT: "hsl(199, 89%, 48%)",   // #0EA5E9
    light: "hsl(201, 94%, 96%)",
    foreground: "hsl(0, 0%, 100%)",
  },
  
  // Neutrals (Slate scale)
  neutral: {
    50: "hsl(210, 20%, 98%)",
    100: "hsl(210, 20%, 96%)",
    200: "hsl(214, 20%, 90%)",
    300: "hsl(213, 15%, 80%)",
    400: "hsl(215, 16%, 47%)",
    500: "hsl(215, 19%, 35%)",
    600: "hsl(217, 22%, 25%)",
    700: "hsl(222, 47%, 11%)",
    800: "hsl(217, 33%, 17%)",
    900: "hsl(222, 47%, 11%)",
  },
} as const;

// ============================================
// GRADIENTS
// ============================================

export const gradients = {
  primary: "linear-gradient(135deg, hsl(174, 62%, 47%) 0%, hsl(187, 78%, 42%) 100%)",
  accent: "linear-gradient(135deg, hsl(38, 92%, 50%) 0%, hsl(45, 93%, 58%) 100%)",
  success: "linear-gradient(135deg, hsl(160, 84%, 39%) 0%, hsl(160, 84%, 50%) 100%)",
  warning: "linear-gradient(135deg, hsl(45, 93%, 47%) 0%, hsl(38, 92%, 50%) 100%)",
  danger: "linear-gradient(135deg, hsl(0, 84%, 60%) 0%, hsl(0, 72%, 51%) 100%)",
  info: "linear-gradient(135deg, hsl(199, 89%, 48%) 0%, hsl(199, 89%, 58%) 100%)",
  subtle: "linear-gradient(180deg, hsl(210, 20%, 98%) 0%, hsl(210, 15%, 94%) 100%)",
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const typography = {
  fontFamily: {
    sans: "'Plus Jakarta Sans', system-ui, sans-serif",
    display: "'Plus Jakarta Sans', system-ui, sans-serif",
    mono: "'JetBrains Mono', monospace",
  },
  fontSize: {
    xs: "clamp(0.7rem, 0.65rem + 0.25vw, 0.8rem)",
    sm: "clamp(0.8rem, 0.75rem + 0.25vw, 0.9rem)",
    base: "clamp(0.875rem, 0.8rem + 0.35vw, 1rem)",
    lg: "clamp(1rem, 0.9rem + 0.5vw, 1.25rem)",
    xl: "clamp(1.125rem, 1rem + 0.6vw, 1.5rem)",
    "2xl": "clamp(1.25rem, 1.1rem + 0.75vw, 1.875rem)",
    "3xl": "clamp(1.5rem, 1.25rem + 1.25vw, 2.25rem)",
    "4xl": "clamp(1.875rem, 1.5rem + 1.875vw, 3rem)",
    "5xl": "clamp(2.25rem, 1.75rem + 2.5vw, 4rem)",
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

// ============================================
// SPACING
// ============================================

export const spacing = {
  sm: "clamp(0.25rem, 0.2rem + 0.25vw, 0.5rem)",
  md: "clamp(0.5rem, 0.4rem + 0.5vw, 1rem)",
  lg: "clamp(1rem, 0.75rem + 1.25vw, 1.5rem)",
  xl: "clamp(1.5rem, 1rem + 2.5vw, 2.5rem)",
} as const;

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  glass: "0 8px 32px hsl(222 47% 11% / 0.08)",
  glow: {
    primary: "0 0 20px hsl(174 62% 47% / 0.3)",
    success: "0 0 20px hsl(160 84% 39% / 0.3)",
    warning: "0 0 20px hsl(45 93% 47% / 0.3)",
    danger: "0 0 20px hsl(0 84% 60% / 0.3)",
  },
} as const;

// ============================================
// BORDERS
// ============================================

export const borders = {
  radius: {
    sm: "calc(0.75rem - 4px)",
    md: "calc(0.75rem - 2px)",
    lg: "0.75rem",
    full: "9999px",
  },
} as const;

// ============================================
// TRANSITIONS
// ============================================

export const transitions = {
  fast: "150ms cubic-bezier(0.4, 0, 0.2, 1)",
  default: "200ms cubic-bezier(0.4, 0, 0.2, 1)",
  slow: "300ms cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "500ms cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

// ============================================
// Z-INDEX SCALE
// ============================================

export const zIndex = {
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
} as const;

// ============================================
// MODULE COLORS (for workspace modules)
// ============================================

export const moduleColors = {
  performance: {
    primary: "hsl(199, 89%, 48%)",     // Info blue
    gradient: "linear-gradient(135deg, hsl(199, 89%, 48%) 0%, hsl(199, 89%, 58%) 100%)",
  },
  listings: {
    primary: "hsl(160, 84%, 39%)",     // Success emerald
    gradient: "linear-gradient(135deg, hsl(160, 84%, 39%) 0%, hsl(160, 84%, 50%) 100%)",
  },
  communication: {
    primary: "hsl(45, 93%, 47%)",      // Warning amber
    gradient: "linear-gradient(135deg, hsl(45, 93%, 47%) 0%, hsl(38, 92%, 50%) 100%)",
  },
  systems: {
    primary: "hsl(270, 70%, 65%)",     // Purple
    gradient: "linear-gradient(135deg, hsl(270, 70%, 65%) 0%, hsl(280, 70%, 55%) 100%)",
  },
  explore: {
    primary: "hsl(174, 62%, 47%)",     // Primary teal
    gradient: "linear-gradient(135deg, hsl(174, 62%, 47%) 0%, hsl(187, 78%, 42%) 100%)",
  },
  grow: {
    primary: "hsl(340, 75%, 70%)",     // Pink
    gradient: "linear-gradient(135deg, hsl(340, 75%, 70%) 0%, hsl(350, 80%, 60%) 100%)",
  },
} as const;

// ============================================
// THEME PACK INTERFACE (for future theme packs)
// ============================================

export interface ThemePack {
  name: string;
  colors: {
    primary: string;
    primaryLight: string;
    accent: string;
    accentLight: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  };
  gradients?: {
    primary?: string;
    accent?: string;
  };
}

// Default theme (current AgentBuddy theme)
export const defaultTheme: ThemePack = {
  name: "AgentBuddy Default",
  colors: {
    primary: "174 62% 47%",
    primaryLight: "187 78% 42%",
    accent: "38 92% 50%",
    accentLight: "45 93% 58%",
    success: "160 84% 39%",
    warning: "45 93% 47%",
    danger: "0 84% 60%",
    info: "199 89% 48%",
  },
};

// Export all tokens as a single object for convenience
export const designTokens = {
  colors,
  gradients,
  typography,
  spacing,
  shadows,
  borders,
  transitions,
  zIndex,
  moduleColors,
} as const;