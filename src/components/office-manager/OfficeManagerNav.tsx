import { NavLink } from '@/components/NavLink';
import { 
  LayoutDashboard, 
  Users, 
  TrendingUp, 
  Package, 
  Calendar, 
  Target,
  UserPlus,
  BarChart3,
  Tag,
  MessageSquare,
  CheckSquare
} from 'lucide-react';

const NAV_ITEMS = [
  {
    label: 'Dashboard',
    path: '/office-manager',
    icon: LayoutDashboard,
  },
  {
    label: 'Messages',
    path: '/office-manager/messages',
    icon: MessageSquare,
  },
  {
    label: 'Tasks',
    path: '/office-manager/tasks',
    icon: CheckSquare,
  },
  {
    label: 'Teams & Users',
    path: '/office-manager/teams-users',
    icon: Users,
  },
  {
    label: 'Performance',
    path: '/office-manager/performance',
    icon: TrendingUp,
  },
  {
    label: 'Stock Board',
    path: '/office-manager/stock-board',
    icon: Package,
  },
  {
    label: 'Listing Expiry',
    path: '/office-manager/listing-expiry',
    icon: Calendar,
  },
  {
    label: 'Appraisal Pipeline',
    path: '/office-manager/appraisals',
    icon: Target,
  },
  {
    label: 'Invitation Log',
    path: '/office-manager/invitation-log',
    icon: UserPlus,
  },
  {
    label: 'Lead Sources',
    path: '/office-manager/lead-sources',
    icon: Tag,
  },
];

interface OfficeManagerNavProps {
  onNavigate?: () => void;
}

export function OfficeManagerNav({ onNavigate }: OfficeManagerNavProps) {
  return (
    <nav className="px-4">
      <div className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/office-manager'}
            onClick={onNavigate}
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            activeClassName="bg-accent text-accent-foreground font-medium"
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
