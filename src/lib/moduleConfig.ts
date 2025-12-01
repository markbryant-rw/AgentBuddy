import { 
  TrendingUp, 
  Flame, 
  FileText, 
  ListChecks, 
  Rocket,
  MessageSquare,
  CheckSquare,
  Users,
  Calendar,
  BarChart3,
  Book,
  type LucideIcon,
} from 'lucide-react';

export interface ModuleConfig {
  id: string;
  name: string;
  icon: LucideIcon;
  route: string;
}

export const moduleConfig: Record<string, ModuleConfig> = {
  'listing-pipeline': {
    id: 'listing-pipeline',
    name: 'Listings',
    icon: Flame,
    route: '/listing-pipeline',
  },
  'opportunity-pipeline': {
    id: 'opportunity-pipeline',
    name: 'Pipeline',
    icon: Flame,
    route: '/opportunity-pipeline',
  },
  'kpi-tracking': {
    id: 'kpi-tracking',
    name: 'KPI Tracker',
    icon: TrendingUp,
    route: '/kpi-tracker',
  },
  'transaction-management': {
    id: 'transaction-management',
    name: 'Transactions',
    icon: FileText,
    route: '/transaction-management',
  },
  'task-manager': {
    id: 'task-manager',
    name: 'Tasks',
    icon: CheckSquare,
    route: '/tasks',
  },
  'messages': {
    id: 'messages',
    name: 'Messages',
    icon: MessageSquare,
    route: '/messages',
  },
  'people': {
    id: 'people',
    name: 'Community',
    icon: Users,
    route: '/community',
  },
  'coaches-corner': {
    id: 'coaches-corner',
    name: 'Coach',
    icon: Rocket,
    route: '/coaches-corner',
  },
  'daily-planner': {
    id: 'daily-planner',
    name: 'Planner',
    icon: Calendar,
    route: '/daily-planner',
  },
  'performance-dashboard': {
    id: 'performance-dashboard',
    name: 'Performance',
    icon: BarChart3,
    route: '/performance',
  },
  'knowledge-base': {
    id: 'knowledge-base',
    name: 'Knowledge',
    icon: Book,
    route: '/knowledge-base',
  },
  'vendor-reporting': {
    id: 'vendor-reporting',
    name: 'Vendor Reports',
    icon: FileText,
    route: '/vendor-reporting',
  },
};
