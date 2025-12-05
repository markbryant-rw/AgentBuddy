import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/hooks/useAuth";
import { TeamProvider } from "@/hooks/useTeam";
import { AgencyProvider } from "@/hooks/useAgency";
import { AppReadinessProvider } from "@/contexts/AppReadinessContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { DiagnosticPanel } from "@/components/DiagnosticPanel";
import { RadixDropdownDebugger } from "@/components/debug/RadixDropdownDebugger";
import Layout from "@/components/Layout";
import { OfficeManagerLayout } from "@/components/OfficeManagerLayout";
import { PlatformAdminLayout } from "@/components/PlatformAdminLayout";
import { lazy, Suspense, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { checkSessionHealth } from "@/lib/sessionHealth";
import { logger } from "@/lib/logger";
import { RouteLoader } from "@/components/RouteLoader";
import { ScrollToTop } from "@/components/ScrollToTop";

// Lazy load all route components for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const LandingAlt = lazy(() => import("./pages/LandingAlt"));
const PlaybookDashboard = lazy(() => import("./pages/PlaybookDashboard"));
const PlanDashboard = lazy(() => import("./pages/PlanDashboard"));
const ReviewSpoke = lazy(() => import("./pages/plan/ReviewSpoke"));
const CurrentSpoke = lazy(() => import("./pages/plan/CurrentSpoke"));
const RoadmapSpoke = lazy(() => import("./pages/plan/RoadmapSpoke"));
const Home = lazy(() => import("./pages/Home"));
const KPITracker = lazy(() => import("./pages/KPITracker"));
const Auth = lazy(() => import("./pages/Auth"));
const AcceptInvitation = lazy(() => import("./pages/AcceptInvitation"));
const CompleteProfile = lazy(() => import("./pages/onboarding/CompleteProfile"));
const InviteUser = lazy(() => import("./pages/InviteUser"));
const AccessDenied = lazy(() => import("./pages/AccessDenied"));
const Setup = lazy(() => import("./pages/Setup"));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const PlatformAdminDashboard = lazy(() => import('./pages/PlatformAdminDashboard'));
const PlatformAdminHealthDashboard = lazy(() => import('./pages/platform-admin/HealthDashboard'));
const PlatformAdminUsers = lazy(() => import('./pages/platform-admin/OfficesOverview'));
const PlatformAdminOfficeDetail = lazy(() => import('./pages/platform-admin/OfficeDetailView'));
const PlatformAdminFeedback = lazy(() => import('./pages/platform-admin/FeedbackManagement'));
const ImpersonationAudit = lazy(() => import('./pages/platform-admin/ImpersonationAudit'));
const AdminMessages = lazy(() => import('./pages/platform-admin/AdminMessages'));
const AdminTasks = lazy(() => import('./pages/platform-admin/AdminTasks'));
const PlatformOperate = lazy(() => import('./pages/platform-admin/PlatformOperate'));
const PlatformMonitor = lazy(() => import('./pages/platform-admin/PlatformMonitor'));
const PlatformManage = lazy(() => import('./pages/platform-admin/PlatformManage'));
const CreateOffice = lazy(() => import('./pages/platform-admin/CreateOffice'));
const CreateTeam = lazy(() => import('./pages/platform-admin/CreateTeam'));
const InviteUserPlatform = lazy(() => import('./pages/platform-admin/InviteUserPlatform'));
const OfficeManagerDashboard = lazy(() => import('./pages/OfficeManagerDashboard'));
const TeamLeaderDashboard = lazy(() => import('./pages/TeamLeaderDashboard'));
const OfficeStockBoard = lazy(() => import('./pages/office-manager/OfficeStockBoard'));
const OfficeListingExpiry = lazy(() => import('./pages/office-manager/OfficeListingExpiry'));
const OfficePerformance = lazy(() => import('./pages/office-manager/OfficePerformance'));
const OfficeAppraisals = lazy(() => import('./pages/office-manager/OfficeAppraisals'));
const TeamsUsersSpoke = lazy(() => import('./pages/office-manager/TeamsUsersSpoke'));
const InvitationActivityLog = lazy(() => import('./pages/office-manager/InvitationActivityLog'));
const OfficeLeadSources = lazy(() => import('./pages/office-manager/OfficeLeadSources'));
const OfficeManagerMessages = lazy(() => import('./pages/office-manager/OfficeManagerMessages'));
const OfficeManagerTasks = lazy(() => import('./pages/office-manager/OfficeManagerTasks'));
const OfficeManagerOperate = lazy(() => import('./pages/office-manager/OfficeManagerOperate'));
const OfficeManagerOffice = lazy(() => import('./pages/office-manager/OfficeManagerOffice'));
const OfficeManagerMonitor = lazy(() => import('./pages/office-manager/OfficeManagerMonitor'));
const OfficeManagerSupport = lazy(() => import('./pages/office-manager/OfficeManagerSupport'));
const TeamManagement = lazy(() => import('./pages/TeamManagement'));
const WeeklyTasksSetup = lazy(() => import('./pages/team/WeeklyTasksSetup'));
const SalespersonDashboard = lazy(() => import('./pages/SalespersonDashboard'));
const AssistantDashboard = lazy(() => import('./pages/AssistantDashboard'));
const WeeklyLogs = lazy(() => import("./pages/WeeklyLogs"));
const Messages = lazy(() => import("./pages/Messages"));
const Goals = lazy(() => import("./pages/Goals"));
const Community = lazy(() => import("./pages/Community"));
const ListingPipeline = lazy(() => import("./pages/ListingPipeline"));
const ProspectDashboard = lazy(() => import("./pages/ProspectDashboard"));
const ProspectAppraisals = lazy(() => import("./pages/ProspectAppraisals"));
const AppraisalImport = lazy(() => import("./pages/AppraisalImport"));
const ProspectPipeline = lazy(() => import("./pages/ProspectPipeline"));
const ProspectAnalyticsPage = lazy(() => import("./pages/ProspectAnalyticsPage"));
const OperateDashboard = lazy(() => import("./pages/OperateDashboard"));
const TransactDashboard = lazy(() => import("./pages/TransactDashboard"));
const GrowDashboard = lazy(() => import("./pages/GrowDashboard"));
const PlatformAdmin = lazy(() => import("./pages/PlatformAdmin"));
const RolePlaying = lazy(() => import("./pages/role-playing/RolePlaying"));
const VendorReporting = lazy(() => import("./pages/vendor-reporting/VendorReporting"));
const NurtureCalculator = lazy(() => import("./pages/nurture-calculator/NurtureCalculator"));
const TransactionManagement = lazy(() => import("./pages/transaction-management/TransactionManagement"));
const TransactionCoordinating = lazy(() => import("./pages/transaction-management/TransactionCoordinating"));
const TemplateLibrary = lazy(() => import("./pages/transaction-management/TemplateLibrary"));
const TemplateEditor = lazy(() => import("./pages/transaction-management/TemplateEditor"));
const StockBoard = lazy(() => import("./pages/transaction-management/StockBoard"));
const ListingExpiryReport = lazy(() => import("./pages/ListingExpiryReport"));
const ReviewRoadmap = lazy(() => import("./pages/ReviewRoadmap"));
const CoachesCorner = lazy(() => import("./pages/CoachesCorner"));
const PastSalesHistory = lazy(() => import("./pages/past-sales/PastSalesHistory"));
const FeedbackCentre = lazy(() => import("./pages/feedback-centre/FeedbackCentre"));
const ListingDescription = lazy(() => import("./pages/listing-description/ListingDescription"));
const ReferralsComingSoon = lazy(() => import("./pages/referrals/ComingSoon"));
const ComplianceComingSoon = lazy(() => import("./pages/compliance/ComingSoon"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const EngageDashboard = lazy(() => import("./pages/EngageDashboard"));
const Leaderboards = lazy(() => import("./pages/engage/Leaderboards"));
const EngageSocialFeed = lazy(() => import("./pages/engage/SocialFeed"));
const TaskManager = lazy(() => import("./pages/TaskManager"));
const TaskMatrix = lazy(() => import("./pages/TaskMatrix"));
const DailyTasks = lazy(() => import("./pages/DailyTasks"));
const DailyPlanner = lazy(() => import("./pages/DailyPlanner"));
const TaskProjects = lazy(() => import("./pages/TaskProjects"));
const TaskProjectBoard = lazy(() => import("./pages/TaskProjectBoard"));
const ProjectKanbanBoard = lazy(() => import("./pages/ProjectKanbanBoard"));
const MyTasks = lazy(() => import("./pages/MyTasks"));
const Profile = lazy(() => import("./pages/Profile"));
const ModuleControl = lazy(() => import("./pages/ModuleControl"));
const Notes = lazy(() => import("./pages/Notes"));
const NoteEditor = lazy(() => import("./pages/NoteEditor"));
const Directory = lazy(() => import("./pages/systems/Directory"));
const Settings = lazy(() => import("./pages/Settings"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase"));
const KnowledgeBaseLibrary = lazy(() => import("./pages/KnowledgeBaseLibrary"));
const KnowledgeBasePlaybook = lazy(() => import("./pages/KnowledgeBasePlaybook"));
const KnowledgeBaseEditor = lazy(() => import("./pages/KnowledgeBaseEditor"));
const KnowledgeBaseAnalytics = lazy(() => import("./pages/KnowledgeBaseAnalytics"));
const LibraryManagement = lazy(() => import("./pages/LibraryManagement"));
const AppraisalTemplateLibrary = lazy(() => import("./pages/appraisal-templates/AppraisalTemplateLibrary"));
const AppraisalTemplateEditor = lazy(() => import("./pages/appraisal-templates/AppraisalTemplateEditor"));

const AppContent = () => {
  useEffect(() => {
    const runHealthCheck = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const isHealthy = await checkSessionHealth();
      if (!isHealthy) {
        logger.warn('Session health check failed - profile incomplete');
        toast.error('Session needs refresh. Please use "Refresh Data" from your user menu.');
      }
    };
    
    runHealthCheck();
  }, []);
  
  return (
    <>
      <DiagnosticPanel />
      <ScrollToTop />
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing-alt" element={<LandingAlt />} />
                <Route path="/auth" element={<AuthGuard><Auth /></AuthGuard>} />
                <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />
                <Route path="/onboarding/complete-profile" element={<CompleteProfile />} />
                <Route path="/access-denied" element={<AccessDenied />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                {/* Salesperson/Workspace Routes */}
                <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                  <Route path="/dashboard" element={<Home />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/plan-dashboard" element={<PlanDashboard />} />
                  <Route path="/plan/review" element={<ReviewSpoke />} />
                  <Route path="/plan/current" element={<CurrentSpoke />} />
                  <Route path="/plan/roadmap" element={<RoadmapSpoke />} />
                  <Route path="/playbook" element={<PlaybookDashboard />} />
                 <Route path="/invite" element={<InviteUser />} />
                 <Route path="/setup" element={<Setup />} />
                 <Route path="/settings" element={<Settings />} />
                <Route path="/team-leader" element={<TeamLeaderDashboard />} />
                  <Route path="/team-management" element={<TeamManagement />} />
                  <Route path="/team/weekly-tasks" element={<WeeklyTasksSetup />} />
                  <Route path="/salesperson" element={<SalespersonDashboard />} />
                  <Route path="/assistant" element={<AssistantDashboard />} />
                  
                  <Route path="/weekly-logs" element={<WeeklyLogs />} />
                  <Route path="/kpi-tracker/goals" element={<Goals />} />
                  <Route path="/listing-pipeline" element={<ListingPipeline />} />
            <Route path="/prospect-dashboard" element={<ProspectDashboard />} />
            <Route path="/prospect-dashboard/appraisals" element={<ProspectAppraisals />} />
            <Route path="/prospect-dashboard/appraisals/import" element={<AppraisalImport />} />
            <Route path="/prospect-dashboard/pipeline" element={<ProspectPipeline />} />
            <Route path="/prospect-dashboard/analytics" element={<ProspectAnalyticsPage />} />
            <Route path="/appraisal-templates" element={<AppraisalTemplateLibrary />} />
            <Route path="/appraisal-templates/:templateId" element={<AppraisalTemplateEditor />} />
            <Route path="/operate-dashboard" element={<OperateDashboard />} />
            <Route path="/transact-dashboard" element={<TransactDashboard />} />
            <Route path="/grow-dashboard" element={<GrowDashboard />} />
            <Route path="/engage-dashboard" element={<EngageDashboard />} />
            <Route path="/engage/leaderboards" element={<Leaderboards />} />
            <Route path="/engage/feed" element={<EngageSocialFeed />} />
            <Route path="/daily-planner" element={<DailyPlanner />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/notes/:noteId" element={<NoteEditor />} />
            <Route path="/systems/directory" element={<Directory />} />
            <Route path="/projects" element={<TaskProjects />} />
            <Route path="/projects/:projectId" element={<ProjectKanbanBoard />} />
            <Route path="/tasks/projects" element={<TaskProjects />} />
            <Route path="/tasks/projects/:boardId" element={<TaskProjectBoard />} />
            <Route path="/tasks/my-assignments" element={<MyTasks />} />
            <Route path="/tasks/matrix" element={<TaskMatrix />} />
                  <Route path="/review-roadmap" element={<ReviewRoadmap />} />
                  <Route path="/role-playing" element={<RolePlaying />} />
                  <Route path="/vendor-reporting" element={<VendorReporting />} />
                  <Route path="/nurture-calculator" element={<NurtureCalculator />} />
                  <Route path="/transaction-management" element={<TransactionManagement />} />
              <Route path="/transaction-coordinating" element={<TransactionCoordinating />} />
              <Route path="/transaction-templates" element={<TemplateLibrary />} />
              <Route path="/transaction-templates/:templateId" element={<TemplateEditor />} />
              <Route path="/stock-board" element={<StockBoard />} />
              <Route path="/listing-expiry-report" element={<ListingExpiryReport />} />
              <Route path="/past-sales-history" element={<PastSalesHistory />} />
                  <Route path="/coaches-corner" element={<CoachesCorner />} />
                  <Route path="/feedback-centre" element={<FeedbackCentre />} />
                  <Route path="/listing-description" element={<ListingDescription />} />
                  <Route path="/referrals" element={<ReferralsComingSoon />} />
                  <Route path="/compliance" element={<ComplianceComingSoon />} />
                  <Route path="/community" element={<Community />} />
                </Route>

                {/* Office Manager Portal Routes - Separate Layout */}
                <Route element={<ProtectedRoute><OfficeManagerLayout /></ProtectedRoute>}>
                  <Route path="/office-manager" element={<OfficeManagerDashboard />} />
                  <Route path="/office-manager/operate" element={<OfficeManagerOperate />} />
                  <Route path="/office-manager/office" element={<OfficeManagerOffice />} />
                  <Route path="/office-manager/monitor" element={<OfficeManagerMonitor />} />
                  <Route path="/office-manager/support" element={<OfficeManagerSupport />} />
                  <Route path="/office-manager/messages" element={<OfficeManagerMessages />} />
                  <Route path="/office-manager/tasks" element={<OfficeManagerTasks />} />
                  <Route path="/office-manager/teams-users" element={<TeamsUsersSpoke />} />
                  <Route path="/office-manager/invitation-log" element={<InvitationActivityLog />} />
                  <Route path="/office-manager/performance" element={<OfficePerformance />} />
                  <Route path="/office-manager/stock-board" element={<OfficeStockBoard />} />
                  <Route path="/office-manager/listing-expiry" element={<OfficeListingExpiry />} />
                  <Route path="/office-manager/appraisals" element={<OfficeAppraisals />} />
                  <Route path="/office-manager/lead-sources" element={<OfficeLeadSources />} />
                </Route>

                {/* Platform Admin Portal Routes - Separate Layout */}
                <Route element={<ProtectedRoute><PlatformAdminLayout /></ProtectedRoute>}>
                  <Route path="/platform-admin" element={<PlatformAdminDashboard />} />
                  <Route path="/platform-admin/operate" element={<PlatformOperate />} />
                  <Route path="/platform-admin/monitor" element={<PlatformMonitor />} />
                  <Route path="/platform-admin/manage" element={<PlatformManage />} />
                  <Route path="/platform-admin/health" element={<PlatformAdminHealthDashboard />} />
                  <Route path="/platform-admin/messages" element={<AdminMessages />} />
                  <Route path="/platform-admin/tasks" element={<AdminTasks />} />
                  <Route path="/platform-admin/feedback" element={<PlatformAdminFeedback />} />
                  <Route path="/platform-admin/audit" element={<ImpersonationAudit />} />
                  <Route path="/platform-admin/users" element={<PlatformAdminUsers />} />
                  <Route path="/platform-admin/users/office/:officeId" element={<PlatformAdminOfficeDetail />} />
                  <Route path="/platform-admin/offices/create" element={<CreateOffice />} />
                  <Route path="/platform-admin/teams/create" element={<CreateTeam />} />
                  <Route path="/platform-admin/users/invite" element={<InviteUserPlatform />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
      </Suspense>
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AuthProvider>
              <TeamProvider>
                <AppReadinessProvider>
                  <AgencyProvider>
                    <RadixDropdownDebugger />
                    <AppContent />
                  </AgencyProvider>
                </AppReadinessProvider>
              </TeamProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
