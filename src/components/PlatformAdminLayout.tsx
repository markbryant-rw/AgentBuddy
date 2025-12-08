import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { AnimatedOutlet } from '@/components/AnimatedOutlet';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  Activity, 
  Building2, 
  Users2, 
  Users, 
  Settings,
  Menu,
  MessageSquarePlus,
  MessageSquare,
  CheckSquare,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserMenuDropdown } from '@/components/UserMenuDropdown';
import { NotificationBell } from '@/components/NotificationBell';
import { MessagesDropdown } from '@/components/MessagesDropdown';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const PLATFORM_ADMIN_NAV = [
  { label: 'Overview', path: '/platform-admin', icon: LayoutDashboard },
  { label: 'Health Dashboard', path: '/platform-admin/health', icon: Activity },
  { label: 'Messages', path: '/platform-admin/messages', icon: MessageSquare },
  { label: 'Tasks', path: '/platform-admin/tasks', icon: CheckSquare },
  { label: 'Feedback', path: '/platform-admin/feedback', icon: MessageSquarePlus },
  { label: 'Impersonation Audit', path: '/platform-admin/audit', icon: Shield },
  { label: 'Users', path: '/platform-admin/users', icon: Users },
  { label: 'Settings', path: '/platform-admin/settings', icon: Settings },
];

export const PlatformAdminLayout = () => {
  const { isPlatformAdmin, loading } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isPlatformAdmin) {
    return <Navigate to="/access-denied" replace />;
  }

  const NavItems = ({ onClick }: { onClick?: () => void }) => (
    <>
      {PLATFORM_ADMIN_NAV.map((item) => {
        const Icon = item.icon;
        const isActive = item.path === '/platform-admin' 
          ? location.pathname === item.path
          : location.pathname.startsWith(item.path);

        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClick}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
              'hover:bg-accent hover:text-accent-foreground',
              isActive && 'bg-accent text-accent-foreground font-medium'
            )}
          >
            <Icon className="h-5 w-5 flex-shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center gap-4 px-6">
          {/* Mobile Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-6 border-b bg-gradient-to-r from-primary/10 to-transparent">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Platform Admin</h2>
                    <p className="text-xs text-muted-foreground">System Management</p>
                  </div>
                </div>
              </div>
              <nav className="flex flex-col gap-1 p-4">
                <NavItems onClick={() => setMobileMenuOpen(false)} />
              </nav>
            </SheetContent>
          </Sheet>

          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-lg">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none">Platform Administration</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">System-wide Management</p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Right: User Menu */}
          <div className="flex items-center gap-3">
            {/* My Workspace Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/dashboard'}
              className="gap-2"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">My Workspace</span>
            </Button>
            
            <NotificationBell />
            <MessagesDropdown />
            <UserMenuDropdown />
          </div>
        </div>
      </header>

      <div className="flex w-full flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 border-r bg-muted/30 min-h-[calc(100vh-4rem)]">
          <nav className="flex flex-col gap-1 p-4">
            <NavItems />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <AnimatedOutlet />
        </main>
      </div>
    </div>
  );
};
