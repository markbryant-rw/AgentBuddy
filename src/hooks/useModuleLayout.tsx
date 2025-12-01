import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ModuleId } from './useModuleAccess';
import { DEFAULT_MODULE_ORDER } from '@/lib/constants';

export const useModuleLayout = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [moduleOrder, setModuleOrder] = useState<ModuleId[]>([...DEFAULT_MODULE_ORDER]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchLayout = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('module_layout')
        .eq('id', user.id)
        .single();

      if (!error && data?.module_layout) {
        const savedLayout = data.module_layout as ModuleId[];
        // Merge any new modules from default order that aren't in saved layout
        const newModules = DEFAULT_MODULE_ORDER.filter(
          moduleId => !savedLayout.includes(moduleId)
        );
        const mergedLayout = [...savedLayout, ...newModules];
        setModuleOrder(mergedLayout);
        
        // Update the saved layout if new modules were added
        if (newModules.length > 0) {
          await supabase
            .from('profiles')
            .update({ module_layout: mergedLayout })
            .eq('id', user.id);
        }
      } else {
        setModuleOrder([...DEFAULT_MODULE_ORDER]);
      }
      setLoading(false);
    };

    fetchLayout();
  }, [user]);

  const saveLayout = async (newOrder: ModuleId[]) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ module_layout: newOrder })
      .eq('id', user.id);

    if (error) {
      toast({
        title: 'Error saving layout',
        description: 'Could not save your module layout',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Layout saved',
        description: 'Your module layout has been updated',
      });
    }
  };

  const updateModuleOrder = (newOrder: ModuleId[]) => {
    setModuleOrder(newOrder);
    saveLayout(newOrder);
  };

  const resetToDefault = () => {
    const defaultOrder = [...DEFAULT_MODULE_ORDER];
    setModuleOrder(defaultOrder);
    saveLayout(defaultOrder);
    toast({
      title: 'Layout reset',
      description: 'Module layout has been reset to default',
    });
  };

  return {
    moduleOrder,
    updateModuleOrder,
    resetToDefault,
    loading,
  };
};
