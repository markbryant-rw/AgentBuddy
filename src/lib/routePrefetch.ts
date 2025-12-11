// Route prefetch utility - preloads workspace chunks on hover for instant navigation

const routeImportMap: Record<string, () => Promise<unknown>> = {
  '/dashboard': () => import('@/pages/Home'),
  '/plan-dashboard': () => import('@/pages/PlaybookDashboard'),
  '/prospect-dashboard': () => import('@/pages/ProspectDashboard'),
  '/transact-dashboard': () => import('@/pages/TransactDashboard'),
  '/operate-dashboard': () => import('@/pages/OperateDashboard'),
  '/grow-dashboard': () => import('@/pages/GrowDashboard'),
  '/engage-dashboard': () => import('@/pages/EngageDashboard'),
};

const prefetchedRoutes = new Set<string>();

export function prefetchRoute(path: string): void {
  // Only prefetch once per session
  if (prefetchedRoutes.has(path)) return;
  
  const importFn = routeImportMap[path];
  if (importFn) {
    prefetchedRoutes.add(path);
    // Fire and forget - we don't need to wait for it
    importFn().catch(() => {
      // Silently fail - route will load normally on click
      prefetchedRoutes.delete(path);
    });
  }
}
