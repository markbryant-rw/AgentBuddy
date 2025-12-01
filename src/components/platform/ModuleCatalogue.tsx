import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { useModulePolicies, Module } from '@/hooks/useModulePolicies';
import { EditModuleDialog } from './EditModuleDialog';
import * as LucideIcons from 'lucide-react';

export const ModuleCatalogue = () => {
  const { modules, modulesLoading } = useModulePolicies();
  const [editingModule, setEditingModule] = useState<Module | null>(null);

  if (modulesLoading) {
    return <div className="p-8 text-center">Loading modules...</div>;
  }

  const categoryColors: Record<string, string> = {
    core: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    'ai-tools': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    social: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    tools: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    'coming-soon': 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
  };

  const getIcon = (iconName: string | null) => {
    if (!iconName) return null;
    const Icon = (LucideIcons as any)[iconName];
    return Icon ? <Icon className="h-5 w-5" /> : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Module Catalogue</h2>
          <p className="text-muted-foreground">All available modules in the platform</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {modules.length} modules
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((module) => (
          <Card key={module.id} className="p-4 hover:shadow-lg transition-shadow relative group">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setEditingModule(module)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                {getIcon(module.icon)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold truncate">{module.title}</h3>
                  {module.is_system && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      System
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {module.description}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge className={categoryColors[module.category] || categoryColors.core}>
                    {module.category}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    Default: {module.default_policy}
                  </Badge>
                </div>
                {module.dependencies && module.dependencies.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Requires: {module.dependencies.join(', ')}
                  </p>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {editingModule && (
        <EditModuleDialog
          module={editingModule}
          open={!!editingModule}
          onOpenChange={(open) => !open && setEditingModule(null)}
        />
      )}
    </div>
  );
};