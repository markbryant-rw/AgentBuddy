import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * Theme Pack Interface
 * Defines the structure for custom theme packs (office branding, seasonal themes, etc.)
 */
export interface ThemePack {
  id: string;
  name: string;
  description?: string;
  colors: {
    // Core palette
    primary: string;        // HSL values without hsl() wrapper, e.g., "174 62% 47%"
    primaryLight: string;
    primaryDark: string;
    accent: string;
    accentLight: string;
    // Semantic colors
    success: string;
    warning: string;
    danger: string;
    info: string;
    // Background/foreground
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
  };
  // Workspace color overrides (optional)
  workspaces?: {
    plan?: { primary: string; gradient: string };
    prospect?: { primary: string; gradient: string };
    transact?: { primary: string; gradient: string };
    operate?: { primary: string; gradient: string };
    grow?: { primary: string; gradient: string };
    engage?: { primary: string; gradient: string };
  };
}

// Default AgentBuddy Theme
export const defaultTheme: ThemePack = {
  id: 'default',
  name: 'AgentBuddy Default',
  description: 'The default teal and amber theme',
  colors: {
    primary: '174 62% 47%',
    primaryLight: '187 78% 42%',
    primaryDark: '174 62% 38%',
    accent: '38 92% 50%',
    accentLight: '45 93% 58%',
    success: '160 84% 39%',
    warning: '45 93% 47%',
    danger: '0 84% 60%',
    info: '199 89% 48%',
    background: '210 20% 98%',
    foreground: '222 47% 11%',
    card: '0 0% 100%',
    cardForeground: '222 47% 11%',
    muted: '210 15% 94%',
    mutedForeground: '215 16% 47%',
    border: '214 20% 90%',
  },
};

// Ray White Theme Example
export const rayWhiteTheme: ThemePack = {
  id: 'raywhite',
  name: 'Ray White',
  description: 'Ray White branded theme',
  colors: {
    primary: '43 100% 50%',      // Ray White yellow
    primaryLight: '45 100% 55%',
    primaryDark: '40 100% 45%',
    accent: '220 13% 18%',       // Dark charcoal
    accentLight: '220 10% 30%',
    success: '160 84% 39%',
    warning: '45 93% 47%',
    danger: '0 84% 60%',
    info: '199 89% 48%',
    background: '0 0% 98%',
    foreground: '220 13% 18%',
    card: '0 0% 100%',
    cardForeground: '220 13% 18%',
    muted: '220 10% 94%',
    mutedForeground: '220 10% 46%',
    border: '220 10% 90%',
  },
};

// 🎄 Christmas Theme - EXTREME FESTIVE IMMERSION
export const christmasTheme: ThemePack = {
  id: 'christmas',
  name: '🎄 Christmas',
  description: 'HO HO HO! Full festive immersion with snow & lights!',
  colors: {
    primary: '0 72% 51%',           // Rich Christmas Red #DC2626
    primaryLight: '0 84% 60%',      // Bright holly red
    primaryDark: '0 72% 40%',       // Deep crimson
    accent: '142 71% 29%',          // Evergreen #15803D
    accentLight: '142 76% 36%',     // Lighter pine
    success: '142 76% 36%',         // Christmas green
    warning: '43 96% 56%',          // Golden star #FACC15
    danger: '0 84% 60%',            // Holly berry red
    info: '199 89% 48%',            // Ice blue
    background: '0 0% 99%',         // Snow white
    foreground: '0 50% 15%',        // Dark crimson text
    card: '0 0% 100%',              // Pure white (snow)
    cardForeground: '0 50% 15%',
    muted: '142 15% 94%',           // Soft pine tint
    mutedForeground: '142 20% 40%',
    border: '0 30% 88%',            // Subtle red tint
  },
};

// Ocean Theme Example
export const oceanTheme: ThemePack = {
  id: 'ocean',
  name: 'Ocean',
  description: 'Cool ocean blues',
  colors: {
    primary: '200 80% 45%',
    primaryLight: '195 85% 55%',
    primaryDark: '205 75% 35%',
    accent: '45 90% 55%',        // Sandy gold
    accentLight: '48 95% 65%',
    success: '160 84% 39%',
    warning: '45 93% 47%',
    danger: '0 84% 60%',
    info: '199 89% 48%',
    background: '200 20% 98%',
    foreground: '205 50% 15%',
    card: '0 0% 100%',
    cardForeground: '205 50% 15%',
    muted: '200 15% 94%',
    mutedForeground: '200 20% 45%',
    border: '200 20% 88%',
  },
};

// Cyberpunk Theme - Extreme neon aesthetic
export const cyberpunkTheme: ThemePack = {
  id: 'cyberpunk',
  name: 'Cyberpunk',
  description: 'Neon-soaked Tron/synthwave aesthetic',
  colors: {
    primary: '185 100% 50%',        // Electric cyan
    primaryLight: '185 100% 65%',
    primaryDark: '185 100% 35%',
    accent: '320 100% 60%',          // Hot pink/magenta
    accentLight: '320 100% 75%',
    success: '150 100% 45%',         // Neon green
    warning: '35 100% 55%',          // Electric orange
    danger: '350 100% 60%',          // Neon red
    info: '210 100% 60%',            // Bright blue
    background: '230 30% 8%',        // Near black with blue tint
    foreground: '185 50% 95%',       // Cyan-tinted white
    card: '230 35% 12%',             // Dark panel
    cardForeground: '185 50% 95%',
    muted: '230 30% 18%',
    mutedForeground: '185 40% 60%',
    border: '185 80% 30%',           // Glowing cyan border
  },
};

// Available theme packs
export const themePacks: ThemePack[] = [
  defaultTheme,
  rayWhiteTheme,
  christmasTheme,
  oceanTheme,
  cyberpunkTheme,
];

interface BrandThemeContextValue {
  currentTheme: ThemePack;
  setTheme: (themeId: string) => void;
  availableThemes: ThemePack[];
  addCustomTheme: (theme: ThemePack) => void;
  removeCustomTheme: (themeId: string) => void;
}

const BrandThemeContext = createContext<BrandThemeContextValue | undefined>(undefined);

export function BrandThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemePack>(defaultTheme);
  const [customThemes, setCustomThemes] = useState<ThemePack[]>([]);

  // Apply theme to CSS custom properties
  const applyTheme = useCallback((theme: ThemePack) => {
    const root = document.documentElement;
    
    // Remove all theme-specific classes first
    root.classList.remove('theme-default', 'theme-raywhite', 'theme-christmas', 'theme-ocean', 'theme-cyberpunk');
    
    // Add current theme class (enables theme-specific CSS effects)
    root.classList.add(`theme-${theme.id}`);
    
    // Apply all color tokens
    root.style.setProperty('--primary', theme.colors.primary);
    root.style.setProperty('--primary-light', theme.colors.primaryLight);
    root.style.setProperty('--primary-dark', theme.colors.primaryDark);
    root.style.setProperty('--accent', theme.colors.accent);
    root.style.setProperty('--accent-light', theme.colors.accentLight);
    root.style.setProperty('--success', theme.colors.success);
    root.style.setProperty('--warning', theme.colors.warning);
    root.style.setProperty('--danger', theme.colors.danger);
    root.style.setProperty('--info', theme.colors.info);
    root.style.setProperty('--background', theme.colors.background);
    root.style.setProperty('--foreground', theme.colors.foreground);
    root.style.setProperty('--card', theme.colors.card);
    root.style.setProperty('--card-foreground', theme.colors.cardForeground);
    root.style.setProperty('--muted', theme.colors.muted);
    root.style.setProperty('--muted-foreground', theme.colors.mutedForeground);
    root.style.setProperty('--border', theme.colors.border);
    root.style.setProperty('--ring', theme.colors.primary);
    
    // Store theme preference
    localStorage.setItem('agentbuddy-brand-theme', theme.id);
  }, []);

  // Load saved theme on mount
  useEffect(() => {
    const savedThemeId = localStorage.getItem('agentbuddy-brand-theme');
    if (savedThemeId) {
      const allThemes = [...themePacks, ...customThemes];
      const savedTheme = allThemes.find(t => t.id === savedThemeId);
      if (savedTheme) {
        setCurrentTheme(savedTheme);
        applyTheme(savedTheme);
      }
    }
  }, [customThemes, applyTheme]);

  const setTheme = useCallback((themeId: string) => {
    const allThemes = [...themePacks, ...customThemes];
    const theme = allThemes.find(t => t.id === themeId);
    if (theme) {
      setCurrentTheme(theme);
      applyTheme(theme);
    }
  }, [customThemes, applyTheme]);

  const addCustomTheme = useCallback((theme: ThemePack) => {
    setCustomThemes(prev => [...prev.filter(t => t.id !== theme.id), theme]);
  }, []);

  const removeCustomTheme = useCallback((themeId: string) => {
    setCustomThemes(prev => prev.filter(t => t.id !== themeId));
    if (currentTheme.id === themeId) {
      setTheme('default');
    }
  }, [currentTheme.id, setTheme]);

  const availableThemes = [...themePacks, ...customThemes];

  return (
    <BrandThemeContext.Provider value={{
      currentTheme,
      setTheme,
      availableThemes,
      addCustomTheme,
      removeCustomTheme,
    }}>
      {children}
    </BrandThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(BrandThemeContext);
  if (context === undefined) {
    // Return default values if used outside provider (for design system page standalone access)
    return {
      currentTheme: defaultTheme,
      setTheme: () => {},
      availableThemes: themePacks,
      addCustomTheme: () => {},
      removeCustomTheme: () => {},
    };
  }
  return context;
}

// Hook to get current theme colors as CSS values
export function useThemeColors() {
  const { currentTheme } = useTheme();
  return {
    primary: `hsl(${currentTheme.colors.primary})`,
    primaryLight: `hsl(${currentTheme.colors.primaryLight})`,
    accent: `hsl(${currentTheme.colors.accent})`,
    success: `hsl(${currentTheme.colors.success})`,
    warning: `hsl(${currentTheme.colors.warning})`,
    danger: `hsl(${currentTheme.colors.danger})`,
    info: `hsl(${currentTheme.colors.info})`,
  };
}
