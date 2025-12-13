import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Plus, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  onLogAppraisal: () => void;
}

export function MobileBottomNav({ onLogAppraisal }: MobileBottomNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isHome = location.pathname === '/dashboard' || location.pathname === '/';
  const isTasks = location.pathname === '/daily-planner';

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-md border-t border-border z-50">
      <div className="flex items-center justify-around h-16 px-4 max-w-md mx-auto">
        {/* Home */}
        <button
          onClick={() => navigate('/dashboard')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
            isHome ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs font-medium">Home</span>
        </button>

        {/* Log Appraisal (Center, Prominent) */}
        <button
          onClick={onLogAppraisal}
          className="flex items-center justify-center -mt-4"
        >
          <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30 active:scale-95 transition-transform">
            <Plus className="h-7 w-7 text-white" />
          </div>
        </button>

        {/* Tasks */}
        <button
          onClick={() => navigate('/daily-planner')}
          className={cn(
            'flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors',
            isTasks ? 'text-primary' : 'text-muted-foreground'
          )}
        >
          <CheckSquare className="h-5 w-5" />
          <span className="text-xs font-medium">Tasks</span>
        </button>
      </div>
    </nav>
  );
}
