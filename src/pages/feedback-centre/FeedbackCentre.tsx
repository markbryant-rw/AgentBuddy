import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeatureRequests } from '@/hooks/useFeatureRequests';
import { useBugReports } from '@/hooks/useBugReports';
import { BugReportForm } from '@/components/feedback/BugReportForm';
import { BugReportCard } from '@/components/feedback/BugReportCard';
import { BugDetailDrawer } from '@/components/feedback/BugDetailDrawer';
import { BugHunterLeaderboard } from '@/components/feedback/BugHunterLeaderboard';
import { ArrowUp, Lightbulb, Users, Vote, Bug, AlertTriangle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import type { BugReport } from '@/hooks/useBugReports';

const FeedbackCentre = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('features');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [bugStatusFilter, setBugStatusFilter] = useState('triage');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBug, setSelectedBug] = useState<string | null>(null);
  const [isBugDrawerOpen, setIsBugDrawerOpen] = useState(false);

  const {
    featureRequests,
    isLoadingRequests,
    userVotes,
    votesRemaining,
    toggleVote,
    isTogglingVote,
    submitRequest,
    isSubmitting,
  } = useFeatureRequests(statusFilter);

  const {
    bugReports,
    isLoadingReports: isLoadingBugs,
  } = useBugReports(bugStatusFilter);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    submitRequest({ title, description }, {
      onSuccess: () => {
        setTitle('');
        setDescription('');
      },
    });
  };

  // Handle URL parameters for direct tab navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const tabParam = searchParams.get('tab');
    if (tabParam === 'bugs') {
      setActiveTab('bugs');
    }
  }, []);

  const handleBugClick = (bug: BugReport) => {
    setSelectedBug(bug.id);
    setIsBugDrawerOpen(true);
  };

  const hasVoted = (requestId: string) => {
    return userVotes.some((v) => v.feature_request_id === requestId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'declined':
        return 'bg-muted text-muted-foreground border-muted';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'In Progress';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-50/30 to-white dark:from-indigo-900/5 dark:to-background p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
              <Lightbulb className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">Feedback Centre</h1>
              <p className="text-muted-foreground mt-1">
                Help us improve AgentBuddy by suggesting features or reporting bugs
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/grow-dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to GROW
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="features" className="flex items-center gap-2">
            💡 Feature Requests
          </TabsTrigger>
          <TabsTrigger value="bugs" className="flex items-center gap-2">
            🐞 Bug Reports
          </TabsTrigger>
          <TabsTrigger value="leaderboard" className="flex items-center gap-2">
            🏆 Bug Hunter Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="features">
          {/* Three Column Layout for Features */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar - Submit Form */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-l-4 border-l-indigo-500 hover:shadow-xl transition-all">
            <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-900/10">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <Lightbulb className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                Submit Idea
              </CardTitle>
              <CardDescription>Share your feature request</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Brief title for your idea"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your feature request..."
                    rows={6}
                    maxLength={1000}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || !title.trim() || !description.trim()}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Voting Stats */}
          <Card className="border-l-4 border-l-indigo-500 hover:shadow-xl transition-all">
            <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-900/10">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <Vote className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                Your Votes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                  {votesRemaining}
                </div>
                <p className="text-sm text-muted-foreground">votes remaining</p>
                <div className="mt-4 text-xs text-muted-foreground">
                  You've used {userVotes.length} of 5 votes
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Request List */}
        <div className="lg:col-span-6">
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="mb-6 bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-900/10">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="declined">Declined</TabsTrigger>
            </TabsList>

            <div className="space-y-4">
              {isLoadingRequests ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-6 w-3/4 mb-4" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-5/6" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : featureRequests.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <div className="relative inline-block">
                    <Lightbulb className="h-20 w-20 mx-auto text-indigo-500 animate-bounce" />
                    <div className="absolute inset-0 h-20 w-20 mx-auto rounded-full bg-indigo-500/20 animate-ping" />
                  </div>
                  <p className="text-xl font-bold">No feature requests yet</p>
                  <p className="text-muted-foreground">Be the first to submit one!</p>
                </div>
              ) : (
                featureRequests.map((request) => {
                  const voted = hasVoted(request.id);
                  return (
                    <Card key={request.id} className="group hover:shadow-xl transition-all border-l-4 border-l-indigo-500">
                      <CardContent className="p-6">
                        <div className="flex gap-4">
                          {/* Vote Button */}
                          <div className="flex flex-col items-center gap-1">
                            <Button
                              variant={voted ? 'default' : 'outline'}
                              size="sm"
                              className="h-12 w-12 rounded-full"
                              onClick={() => toggleVote(request.id)}
                              disabled={isTogglingVote || (!voted && votesRemaining === 0)}
                            >
                              <ArrowUp className="h-5 w-5" />
                            </Button>
                            <span className="text-sm font-bold">{request.vote_count}</span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 space-y-3">
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h3 className="font-semibold text-lg leading-tight">
                                  {request.title}
                                </h3>
                                <Badge variant="outline" className={getStatusColor(request.status)}>
                                  {getStatusLabel(request.status)}
                                </Badge>
                              </div>
                              <p className="text-muted-foreground text-sm">
                                {request.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>By {request.profiles?.full_name || 'Anonymous'}</span>
                              <span>•</span>
                              <span>{format(new Date(request.created_at), 'MMM d, yyyy')}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </Tabs>
        </div>

        {/* Right Sidebar - Stats */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-l-4 border-l-indigo-500 hover:shadow-xl transition-all">
            <CardHeader className="bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-900/10">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                  <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                Community
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{featureRequests.length}</div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {featureRequests.filter((r) => r.status === 'completed').length}
                </div>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {featureRequests.filter((r) => r.status === 'in_progress').length}
                </div>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-900/10 dark:to-background border-indigo-500/20">
            <CardContent className="p-6">
              <h4 className="font-semibold mb-2">How it works</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Submit feature ideas</li>
                <li>• Vote on requests you like</li>
                <li>• You have 5 votes total</li>
                <li>• Remove votes to reallocate</li>
                <li>• Top voted get prioritized</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </TabsContent>

    <TabsContent value="bugs">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar - Bug Submission Form */}
        <div className="lg:col-span-3">
          <BugReportForm />
        </div>

        {/* Main Content - Bug Reports List */}
        <div className="lg:col-span-6">
          <Tabs value={bugStatusFilter} onValueChange={setBugStatusFilter}>
            <TabsList className="mb-6 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-900/10">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="triage">Triage</TabsTrigger>
              <TabsTrigger value="in_progress">In Progress</TabsTrigger>
              <TabsTrigger value="needs_review">Needs Review</TabsTrigger>
              <TabsTrigger value="fixed">Fixed</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>

            <div className="space-y-4">
              {isLoadingBugs ? (
                <>
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <Skeleton className="h-6 w-3/4 mb-4" />
                        <Skeleton className="h-4 w-full mb-2" />
                        <Skeleton className="h-4 w-5/6" />
                      </CardContent>
                    </Card>
                  ))}
                </>
              ) : bugReports.length === 0 ? (
                <div className="text-center py-16 space-y-4">
                  <div className="relative inline-block">
                    <Bug className="h-20 w-20 mx-auto text-red-500" />
                    <div className="absolute inset-0 h-20 w-20 mx-auto rounded-full bg-red-500/20 animate-ping" />
                  </div>
                  <p className="text-xl font-bold">No bug reports yet</p>
                  <p className="text-muted-foreground">Be the first to report an issue!</p>
                </div>
              ) : (
                bugReports.map((bug) => (
                  <BugReportCard
                    key={bug.id}
                    bug={bug}
                    onClick={() => handleBugClick(bug)}
                  />
                ))
              )}
            </div>
          </Tabs>
        </div>

        {/* Right Sidebar - Bug Stats */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-900/10">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                Bug Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {bugReports.length}
                </div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {bugReports.filter((r) => r.status === 'fixed').length}
                </div>
                <p className="text-sm text-muted-foreground">Fixed</p>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {bugReports.filter((r) => r.status === 'investigating').length}
                </div>
                <p className="text-sm text-muted-foreground">Investigating</p>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {bugReports.filter((r) => r.severity === 'critical' || r.severity === 'high').length}
                </div>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50/50 to-white dark:from-red-900/10 dark:to-background border-red-500/20">
            <CardContent className="p-6">
              <h4 className="font-semibold mb-2">Reporting Tips</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Be specific and detailed</li>
                <li>• Include steps to reproduce</li>
                <li>• Add screenshots if possible</li>
                <li>• Select appropriate severity</li>
                <li>• One bug per report</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </TabsContent>

    <TabsContent value="leaderboard">
      <div className="max-w-4xl mx-auto">
        <BugHunterLeaderboard />
      </div>
    </TabsContent>
  </Tabs>

      <BugDetailDrawer
        bugId={selectedBug || ''}
        open={isBugDrawerOpen && !!selectedBug}
        onClose={() => setIsBugDrawerOpen(false)}
      />
    </div>
  );
};

export default FeedbackCentre;
