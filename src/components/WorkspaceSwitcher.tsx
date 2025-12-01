import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Briefcase, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface WorkspaceSwitcherProps {
  currentWorkspace: 'management' | 'salesperson';
}

export function WorkspaceSwitcher({ currentWorkspace }: WorkspaceSwitcherProps) {
  const navigate = useNavigate();
  const { activeRole } = useAuth();

  if (currentWorkspace === 'management') {
    return (
      <Button
        variant="outline"
        size="lg"
        onClick={() => navigate('/dashboard')}
        className="w-full sm:w-auto"
      >
        <Briefcase className="w-5 h-5 mr-2" />
        Switch to Salesperson Workspace
      </Button>
    );
  }

  // Only show switch to management if user has a management role
  if (!activeRole || activeRole === 'salesperson' || activeRole === 'assistant') {
    return null;
  }

  const managementRoutes = {
    platform_admin: '/platform-admin',
    office_manager: '/office-manager',
    team_leader: '/team-leader',
  };

  const route = managementRoutes[activeRole as keyof typeof managementRoutes];
  if (!route) return null;

  return (
    <Button
      variant="outline"
      size="lg"
      onClick={() => navigate(route)}
      className="w-full sm:w-auto"
    >
      <LayoutDashboard className="w-5 h-5 mr-2" />
      Switch to Management View
    </Button>
  );
}
