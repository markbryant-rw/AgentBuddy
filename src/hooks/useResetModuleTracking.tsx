import { toast } from 'sonner';

// Stubbed hook - module usage tracking feature coming soon
// The module_usage_stats table is not yet implemented

export const useResetModuleTracking = () => {
  const resetTracking = () => {
    toast.info('Module tracking reset coming soon');
  };

  return {
    resetTracking,
    isResetting: false,
  };
};