/**
 * Module Color System
 * Aligned with the AgentBuddy Design System
 * Uses semantic color tokens for consistency
 */

export const MODULE_COLORS = {
  performance: {
    primary: 'hsl(199, 89%, 48%)',     // Info blue
    light: 'hsl(201, 94%, 96%)',
    dark: 'hsl(199, 89%, 35%)',
    gradient: 'from-info to-info/80',
    bg: 'bg-info-light',
    border: 'border-info',
    text: 'text-info',
    iconBg: 'bg-info/10',
  },
  listings: {
    primary: 'hsl(160, 84%, 39%)',     // Success emerald
    light: 'hsl(152, 76%, 95%)',
    dark: 'hsl(160, 84%, 30%)',
    gradient: 'from-success to-success/80',
    bg: 'bg-success-light',
    border: 'border-success',
    text: 'text-success',
    iconBg: 'bg-success/10',
  },
  communication: {
    primary: 'hsl(45, 93%, 47%)',      // Warning amber
    light: 'hsl(48, 96%, 95%)',
    dark: 'hsl(45, 93%, 35%)',
    gradient: 'from-warning to-accent',
    bg: 'bg-warning-light',
    border: 'border-warning',
    text: 'text-warning',
    iconBg: 'bg-warning/10',
  },
  systems: {
    primary: 'hsl(270, 70%, 65%)',     // Purple (custom)
    light: 'hsl(270, 60%, 95%)',
    dark: 'hsl(270, 70%, 45%)',
    gradient: 'from-[hsl(270,70%,65%)] to-[hsl(280,70%,55%)]',
    bg: 'bg-[hsl(270,60%,95%)]',
    border: 'border-[hsl(270,70%,65%)]',
    text: 'text-[hsl(270,70%,65%)]',
    iconBg: 'bg-[hsl(270,70%,65%)]/10',
  },
  explore: {
    primary: 'hsl(174, 62%, 47%)',     // Primary teal
    light: 'hsl(174, 62%, 95%)',
    dark: 'hsl(174, 62%, 35%)',
    gradient: 'from-primary to-primary-light',
    bg: 'bg-primary/5',
    border: 'border-primary',
    text: 'text-primary',
    iconBg: 'bg-primary/10',
  },
  grow: {
    primary: 'hsl(340, 75%, 70%)',     // Pink
    light: 'hsl(340, 75%, 95%)',
    dark: 'hsl(340, 75%, 50%)',
    gradient: 'from-[hsl(340,75%,70%)] to-[hsl(350,80%,60%)]',
    bg: 'bg-[hsl(340,75%,95%)]',
    border: 'border-[hsl(340,75%,70%)]',
    text: 'text-[hsl(340,75%,70%)]',
    iconBg: 'bg-[hsl(340,75%,70%)]/10',
  },
} as const;

export type ModuleCategoryColor = keyof typeof MODULE_COLORS;

/**
 * Get gradient classes for a module
 */
export function getModuleGradient(module: ModuleCategoryColor): string {
  return `bg-gradient-to-r ${MODULE_COLORS[module].gradient}`;
}

/**
 * Get text color class for a module
 */
export function getModuleTextColor(module: ModuleCategoryColor): string {
  return MODULE_COLORS[module].text;
}

/**
 * Get background color class for a module
 */
export function getModuleBgColor(module: ModuleCategoryColor): string {
  return MODULE_COLORS[module].bg;
}

/**
 * Get icon background class for a module
 */
export function getModuleIconBg(module: ModuleCategoryColor): string {
  return MODULE_COLORS[module].iconBg;
}