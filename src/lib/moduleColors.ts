export const MODULE_COLORS = {
  performance: {
    primary: '#3B82F6', // Blue
    light: '#DBEAFE',
    dark: '#1E40AF',
    gradient: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-900/10',
    border: 'border-blue-500',
    text: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
  },
  listings: {
    primary: '#10B981', // Green
    light: '#D1FAE5',
    dark: '#047857',
    gradient: 'from-green-500 to-emerald-600',
    bg: 'bg-green-50 dark:bg-green-900/10',
    border: 'border-green-500',
    text: 'text-green-600 dark:text-green-400',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
  },
  communication: {
    primary: '#FACC15', // Yellow
    light: '#FEF3C7',
    dark: '#CA8A04',
    gradient: 'from-yellow-400 to-amber-500',
    bg: 'bg-yellow-50 dark:bg-yellow-900/10',
    border: 'border-yellow-500',
    text: 'text-yellow-600 dark:text-yellow-400',
    iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  systems: {
    primary: '#6366F1', // Indigo
    light: '#E0E7FF',
    dark: '#4338CA',
    gradient: 'from-indigo-500 to-purple-600',
    bg: 'bg-indigo-50 dark:bg-indigo-900/10',
    border: 'border-indigo-500',
    text: 'text-indigo-600 dark:text-indigo-400',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
  explore: {
    primary: '#14B8A6', // Teal
    light: '#CCFBF1',
    dark: '#0F766E',
    gradient: 'from-teal-500 to-cyan-600',
    bg: 'bg-teal-50 dark:bg-teal-900/10',
    border: 'border-teal-500',
    text: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-100 dark:bg-teal-900/30',
  },
  grow: {
    primary: '#EC4899', // Pink
    light: '#FCE7F3',
    dark: '#BE185D',
    gradient: 'from-pink-500 to-rose-600',
    bg: 'bg-pink-50 dark:bg-pink-900/10',
    border: 'border-pink-500',
    text: 'text-pink-600 dark:text-pink-400',
    iconBg: 'bg-pink-100 dark:bg-pink-900/30',
  },
} as const;

export type ModuleCategoryColor = keyof typeof MODULE_COLORS;
