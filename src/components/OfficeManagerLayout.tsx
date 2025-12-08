import { useNavigate } from 'react-router-dom';
import { AnimatedOutlet } from '@/components/AnimatedOutlet';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Menu } from 'lucide-react';
import agentBuddyLogo from '@/assets/agentbuddy-logo.png';
import { NotificationBell } from '@/components/NotificationBell';
import { MessagesDropdown } from '@/components/MessagesDropdown';
import { UserMenuDropdown } from '@/components/UserMenuDropdown';
import { OfficeSwitcher } from '@/components/OfficeSwitcher';
import { OfficeManagerNav } from '@/components/office-manager/OfficeManagerNav';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

export const OfficeManagerLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { activeOffice, isLoading } = useOfficeSwitcher();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Professional Office Manager Header */}
      <header className="sticky top-0 z-[100] border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Mobile Menu + Branding */}
            <div className="flex items-center gap-6">
              {/* Mobile Menu Toggle */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="py-4">
                    <OfficeManagerNav onNavigate={() => setMobileMenuOpen(false)} />
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-3">
                <img 
                  src={agentBuddyLogo} 
                  alt="AgentBuddy" 
                  className="h-10 w-10 rounded-lg"
                />
                <div>
                  <h1 className="text-lg font-semibold text-foreground">Office Management</h1>
                  {activeOffice && !isLoading && (
                    <p className="text-xs text-muted-foreground">{activeOffice.name}</p>
                  )}
                </div>
              </div>

              {/* Office Switcher */}
              <OfficeSwitcher />
            </div>

            {/* Right: Actions & User Menu */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
                className="gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">My Workspace</span>
              </Button>
              
              <MessagesDropdown />
              <NotificationBell />
              <UserMenuDropdown />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout with Sidebar */}
      <div className="flex min-h-[calc(100vh-4rem)] w-full">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 border-r bg-muted/30">
          <div className="sticky top-16 py-4">
            <OfficeManagerNav />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
            <AnimatedOutlet />
          </div>
        </main>
      </div>
    </div>
  );
};
