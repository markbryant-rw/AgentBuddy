// Stubbed - Admin impersonation logging is a deferred feature
// This hook returns inactive state until the feature is implemented

interface ImpersonationAlertState {
  isBeingViewed: boolean;
  adminName: string;
  adminEmail: string;
  reason: string;
  startedAt: string;
}

export const useImpersonationAlert = (): ImpersonationAlertState => {
  // Feature not yet implemented - return inactive state
  return {
    isBeingViewed: false,
    adminName: '',
    adminEmail: '',
    reason: '',
    startedAt: '',
  };
};
