import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { User, Users, Settings, LogOut, MoreVertical, Shield, BookOpen, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MobileMoreMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, isPlatformAdmin } = useAuth();
  const isActive = location.pathname === '/setup';

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          className={cn(
            'flex-1 h-full flex flex-col items-center justify-center space-y-1',
            isActive && 'text-primary'
          )}
        >
          <MoreVertical className="h-5 w-5" />
          <span className="text-xs">More</span>
        </button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="h-auto">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col gap-2 py-4">
          <Button
            variant="ghost"
            className="w-full justify-start h-12"
            onClick={() => navigate('/knowledge-base')}
          >
            <BookOpen className="mr-2 h-4 w-4" />
            Knowledge Base
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start h-12"
            onClick={() => navigate('/notes')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Notes
          </Button>
          
          <Button
            variant="ghost"
            className="w-full justify-start h-12"
            onClick={() => navigate('/setup')}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          
          {isPlatformAdmin && (
            <Button
              variant="ghost"
              className="w-full justify-start h-12"
              onClick={() => navigate('/platform-admin')}
            >
              <Shield className="mr-2 h-4 w-4" />
              Platform Admin
            </Button>
          )}
          
          <Separator className="my-2" />
          
          <Button
            variant="ghost"
            className="w-full justify-start h-12 text-destructive hover:text-destructive"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
