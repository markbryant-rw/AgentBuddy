import { useAuth } from './useAuth';

export const useViewAs = () => {
  const { 
    startViewingAs: authStartViewingAs, 
    stopViewingAs, 
    isViewingAs, 
    viewAsUser, 
    actualAdmin 
  } = useAuth();

  const startViewingAs = async (userId: string, reason?: string) => {
    return authStartViewingAs(userId, reason);
  };

  return {
    startViewingAs,
    stopViewingAs,
    isViewingAs,
    viewAsUser,
    actualAdmin,
  };
};
