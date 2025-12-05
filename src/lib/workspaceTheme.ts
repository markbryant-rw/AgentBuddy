/**
 * Workspace Theme Configuration
 * Centralized theming for all 6 workspaces
 */

export type WorkspaceType = 'plan' | 'prospect' | 'transact' | 'operate' | 'grow' | 'engage';

export interface WorkspaceTheme {
  name: string;
  gradient: string;
  gradientHover: string;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  accent: string;
  barColor: string;
  textColor: string;
  hoverColor: string;
  route: string;
}

export const workspaceThemes: Record<WorkspaceType, WorkspaceTheme> = {
  plan: {
    name: 'Plan',
    gradient: 'from-blue-500/10 to-indigo-600/20',
    gradientHover: 'hover:from-blue-500/20 hover:to-indigo-600/30',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-l-blue-500',
    accent: 'bg-blue-500',
    barColor: 'bg-blue-500/10 dark:bg-blue-500/20 border-b border-blue-500/20',
    textColor: 'text-blue-700 dark:text-blue-300',
    hoverColor: 'hover:bg-blue-500/20',
    route: '/plan-dashboard',
  },
  prospect: {
    name: 'Prospect',
    gradient: 'from-teal-500/10 to-cyan-600/20',
    gradientHover: 'hover:from-teal-500/20 hover:to-cyan-600/30',
    iconBg: 'bg-teal-100 dark:bg-teal-900/30',
    iconColor: 'text-teal-600 dark:text-teal-400',
    borderColor: 'border-l-teal-500',
    accent: 'bg-teal-500',
    barColor: 'bg-teal-500/10 dark:bg-teal-500/20 border-b border-teal-500/20',
    textColor: 'text-teal-700 dark:text-teal-300',
    hoverColor: 'hover:bg-teal-500/20',
    route: '/prospect-dashboard',
  },
  transact: {
    name: 'Transact',
    gradient: 'from-amber-500/10 to-orange-600/20',
    gradientHover: 'hover:from-amber-500/20 hover:to-orange-600/30',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-l-amber-500',
    accent: 'bg-amber-500',
    barColor: 'bg-amber-500/10 dark:bg-amber-500/20 border-b border-amber-500/20',
    textColor: 'text-amber-700 dark:text-amber-300',
    hoverColor: 'hover:bg-amber-500/20',
    route: '/transact-dashboard',
  },
  operate: {
    name: 'Operate',
    gradient: 'from-purple-500/10 to-violet-600/20',
    gradientHover: 'hover:from-purple-500/20 hover:to-violet-600/30',
    iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    borderColor: 'border-l-purple-500',
    accent: 'bg-purple-500',
    barColor: 'bg-purple-500/10 dark:bg-purple-500/20 border-b border-purple-500/20',
    textColor: 'text-purple-700 dark:text-purple-300',
    hoverColor: 'hover:bg-purple-500/20',
    route: '/operate-dashboard',
  },
  grow: {
    name: 'Grow',
    gradient: 'from-emerald-500/10 to-green-600/20',
    gradientHover: 'hover:from-emerald-500/20 hover:to-green-600/30',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-l-emerald-500',
    accent: 'bg-emerald-500',
    barColor: 'bg-emerald-500/10 dark:bg-emerald-500/20 border-b border-emerald-500/20',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    hoverColor: 'hover:bg-emerald-500/20',
    route: '/grow-dashboard',
  },
  engage: {
    name: 'Engage',
    gradient: 'from-pink-500/10 to-rose-600/20',
    gradientHover: 'hover:from-pink-500/20 hover:to-rose-600/30',
    iconBg: 'bg-pink-100 dark:bg-pink-900/30',
    iconColor: 'text-pink-600 dark:text-pink-400',
    borderColor: 'border-l-pink-500',
    accent: 'bg-pink-500',
    barColor: 'bg-pink-500/10 dark:bg-pink-500/20 border-b border-pink-500/20',
    textColor: 'text-pink-700 dark:text-pink-300',
    hoverColor: 'hover:bg-pink-500/20',
    route: '/engage-dashboard',
  },
};

export const getWorkspaceTheme = (workspace: WorkspaceType): WorkspaceTheme => {
  return workspaceThemes[workspace];
};
