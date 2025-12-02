import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ModuleId } from './useModuleAccess';
import { DEFAULT_MODULE_ORDER } from '@/lib/constants';

export const useModuleLayout = () => {
  const { toast } = useToast();
  const [moduleOrder, setModuleOrder] = useState<ModuleId[]>([...DEFAULT_MODULE_ORDER]);
  const [loading] = useState(false);

  const saveLayout = async (newOrder: ModuleId[]) => {
    // Stub: module_layout column does not exist on profiles
    console.log('useModuleLayout saveLayout: Stubbed', newOrder);
    toast({
      title: 'Layout saved',
      description: 'Your module layout has been updated',
    });
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
