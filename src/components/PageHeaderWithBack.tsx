import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface PageHeaderWithBackProps {
  title: string;
  description?: string;
  backPath?: string;
}

export function PageHeaderWithBack({ title, description, backPath }: PageHeaderWithBackProps) {
  const navigate = useNavigate();
  const { activeRole } = useAuth();

  // Determine default back path based on active role if not specified
  const getDefaultBackPath = () => {
    if (backPath) return backPath;
    
    switch (activeRole) {
      case 'platform_admin':
        return '/platform-admin';
      case 'office_manager':
        return '/office-manager';
      case 'team_leader':
        return '/team-leader';
      default:
        return '/dashboard';
    }
  };

  return (
    <div className="border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(getDefaultBackPath())}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
        <h1 className="text-3xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}
