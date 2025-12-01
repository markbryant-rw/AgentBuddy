import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useModulePolicies } from '@/hooks/useModulePolicies';
import { ModulePolicyDialog } from './ModulePolicyDialog';
import { useAgencyOverview } from '@/hooks/useAgencyOverview';
import { TeamSearchCombobox } from './TeamSearchCombobox';
import { UserSearchCombobox } from './UserSearchCombobox';
import { Settings, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import * as LucideIcons from 'lucide-react';

export const ModulePoliciesManager = () => {
  const { modules, modulesLoading, usePolicies, upsertPolicy, deletePolicy } = useModulePolicies();
  const { data: agencies = [], isLoading: agenciesLoading } = useAgencyOverview();
  
  const [scopeType, setScopeType] = useState<'global' | 'office' | 'team' | 'user'>('global');
  const [scopeId, setScopeId] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<{
    id: string;
    title: string;
  } | null>(null);
  
  const { data: policies = [] } = usePolicies(scopeType, scopeId || undefined);

  const getPolicyForModule = (moduleId: string) => {
    return policies.find(p => p.module_id === moduleId);
  };

  const getPolicyBadge = (policy: string) => {
    const configs = {
      enabled: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30', label: 'Enabled' },
      locked: { color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30', label: 'Locked' },
      hidden: { color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30', label: 'Hidden' },
      trial: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30', label: 'Trial' },
      premium_required: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30', label: 'Premium' },
    };
    const config = configs[policy as keyof typeof configs] || configs.enabled;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const getIcon = (iconName: string | null) => {
    if (!iconName) return null;
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  if (modulesLoading) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Module Policies</h2>
          <p className="text-muted-foreground">Control module access at different scopes</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Scope</label>
            <Select value={scopeType} onValueChange={(v: any) => {
              setScopeType(v);
              setScopeId(null);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Global (All Users)</SelectItem>
                <SelectItem value="office">Office</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {scopeType === 'office' && (
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Office</label>
              <Select value={scopeId || ''} onValueChange={setScopeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose office..." />
                </SelectTrigger>
                <SelectContent>
                  {agenciesLoading ? (
                    <div className="p-2 text-sm text-muted-foreground">Loading...</div>
                  ) : (
                    agencies.map(office => (
                      <SelectItem key={office.id} value={office.id}>
                        {office.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {scopeType === 'team' && (
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select Team</label>
              <TeamSearchCombobox
                value={scopeId}
                onValueChange={(value) => setScopeId(value)}
              />
            </div>
          )}

          {scopeType === 'user' && (
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Select User</label>
              <UserSearchCombobox
                value={scopeId}
                onValueChange={(value) => setScopeId(value)}
              />
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => {
          const policy = getPolicyForModule(module.id);
          const effectivePolicy = policy?.policy || module.default_policy;

          return (
            <Card key={module.id} className="p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded bg-primary/10">
                    {getIcon(module.icon)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{module.title}</h3>
                    <p className="text-xs text-muted-foreground">{module.id}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedModule({ id: module.id, title: module.title })}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Current Policy:</span>
                  {getPolicyBadge(effectivePolicy)}
                </div>

                {policy ? (
                  <div className="flex items-start gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3 w-3 text-muted-foreground mt-0.5" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            {policy.reason || 'Custom policy applied'}
                          </p>
                          {policy.expires_at && (
                            <p className="text-xs mt-1">
                              Expires: {new Date(policy.expires_at).toLocaleDateString()}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-xs text-muted-foreground">
                      {scopeType} override active
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    ← Inherited from default
                  </p>
                )}

                {policy && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-xs"
                    onClick={() => deletePolicy.mutate({ id: policy.id, moduleId: module.id })}
                  >
                    Remove Override
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {selectedModule && (
        <ModulePolicyDialog
          open={!!selectedModule}
          onOpenChange={(open) => !open && setSelectedModule(null)}
          moduleId={selectedModule.id}
          moduleTitle={selectedModule.title}
          scopeType={scopeType}
          scopeId={scopeId}
          currentPolicy={getPolicyForModule(selectedModule.id)}
          onSave={(policy) => {
            upsertPolicy.mutate({ ...policy, created_by: undefined } as any);
          }}
        />
      )}
    </div>
  );
};