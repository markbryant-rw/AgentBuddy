import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAllModuleAccess } from '@/hooks/useModuleAccess';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { ALL_MODULES } from '@/lib/constants';
import { Lock, Unlock, Gift, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MODULE_INFO: Record<string, { name: string; description: string; icon: string }> = {
  'kpi-tracking': { name: 'Goals & Targets', description: 'Track your weekly and quarterly KPIs', icon: '📊' },
  'listing-pipeline': { name: 'Listing Pipeline', description: 'Manage your listing opportunities', icon: '🏠' },
  'review-roadmap': { name: 'Review Roadmap', description: 'Quarterly reviews and action plans', icon: '🗺️' },
  'nurture-calculator': { name: 'Nurture Calculator', description: 'Calculate your nurture strategy', icon: '🧮' },
  'role-playing': { name: 'Role Playing', description: 'AI-powered practice scenarios', icon: '🎭' },
  'vendor-reporting': { name: 'Vendor Reporting', description: 'Generate professional vendor reports', icon: '📄' },
  'coaches-corner': { name: 'Coaches Corner', description: 'AI coaching and guidance', icon: '🤖' },
  'transaction-management': { name: 'Transaction Management', description: 'Manage your active deals', icon: '💼' },
  'feature-request': { name: 'Feature Requests', description: 'Submit and vote on features', icon: '💡' },
  'listing-description': { name: 'Listing Description', description: 'AI-generated listing copy', icon: '✍️' },
  'referrals': { name: 'Referrals', description: 'Collaborate and track agent referrals', icon: '🤝' },
  'compliance': { name: 'Compliance', description: 'AI-powered REINZ guidance for clauses', icon: '⚖️' },
  'people': { name: 'People', description: 'Connect with your team and network', icon: '👥' },
  'messages': { name: 'Messages', description: 'Team communication and channels', icon: '💬' },
  'task-manager': { name: 'Task Manager', description: 'Organize and track your tasks', icon: '✅' },
  'notes': { name: 'Notes', description: 'Create and manage your notes', icon: '📝' },
  'team-meetings': { name: 'Team Meetings', description: 'Schedule and manage meetings', icon: '📅' },
  'knowledge-base': { name: 'Knowledge Base', description: 'Access team knowledge and resources', icon: '📚' },
  'past-sales-history': { name: 'Past Sales History', description: 'Track and analyze past sales', icon: '📈' },
  'cma-generator': { name: 'CMA Generator', description: 'Create comparative market analyses', icon: '📊' },
};

export const ModuleAccessCard = () => {
  const modules = useAllModuleAccess();
  const { preferences, toggleModuleVisibility } = useUserPreferences();
  const [discountCode, setDiscountCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const loading = Object.values(modules).some(m => m.loading);

  const handleRedeemCode = async () => {
    if (!discountCode.trim()) {
      toast.error('Please enter a discount code');
      return;
    }

    setRedeeming(true);
    try {
      const { error } = await supabase.functions.invoke('apply-discount-code', {
        body: { code: discountCode.trim().toUpperCase() },
      });

      if (error) throw error;

      toast.success('Discount code redeemed successfully!');
      setDiscountCode('');
      // Refresh the page to update module access
      window.location.reload();
    } catch (error: any) {
      console.error('Error redeeming code:', error);
      toast.error(error.message || 'Invalid or expired discount code');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-7 bg-muted rounded w-32 animate-pulse" />
          <div className="h-4 bg-muted rounded w-64 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Module Access
        </CardTitle>
        <CardDescription>View and manage your unlocked features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Module Grid */}
        <div className="grid gap-4 md:grid-cols-2">
        {ALL_MODULES.map((moduleId) => {
            const info = MODULE_INFO[moduleId];
            const isUnlocked = modules[moduleId]?.hasAccess || false;
            const isVisible = preferences.module_visibility?.[moduleId] !== false;

            return (
              <div
                key={moduleId}
                className={`p-4 rounded-lg border ${
                  isUnlocked ? 'bg-background' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <h4 className="font-semibold text-sm">{info.name}</h4>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {isUnlocked ? (
                      <>
                        <Badge variant="default" className="gap-1">
                          <Unlock className="h-3 w-3" />
                          Unlocked
                        </Badge>
                        {!isVisible && (
                          <Badge variant="outline" className="gap-1">
                            <EyeOff className="h-3 w-3" />
                            Hidden
                          </Badge>
                        )}
                      </>
                    ) : (
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="h-3 w-3" />
                        Locked
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{info.description}</p>
                {isUnlocked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2 gap-2 text-xs"
                    onClick={() => toggleModuleVisibility(moduleId)}
                  >
                    {isVisible ? (
                      <>
                        <EyeOff className="h-3 w-3" />
                        Hide from Dashboard
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" />
                        Show on Dashboard
                      </>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Discount Code Redemption */}
        <div className="pt-4 border-t space-y-3">
          <Label>Redeem Discount Code</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Enter code..."
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && handleRedeemCode()}
              className="uppercase"
            />
            <Button onClick={handleRedeemCode} disabled={redeeming || !discountCode.trim()}>
              {redeeming ? 'Redeeming...' : 'Redeem'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Enter a discount code to unlock premium modules
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
