import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QuarterSelector } from '@/components/QuarterSelector';
import { QuarterlyGoalCard } from '@/components/QuarterlyGoalCard';
import { useFinancialYear } from '@/hooks/useFinancialYear';
import { useQuarterlyGoals } from '@/hooks/useQuarterlyGoals';
import { useQuarterlyReview } from '@/hooks/useQuarterlyReview';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, Target, TrendingUp, BookOpen, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const KPI_TYPES = [
  { value: 'listings_taken', label: 'Listings Taken' },
  { value: 'listings_sold', label: 'Listings Sold' },
  { value: 'buyer_conversations', label: 'Buyer Conversations' },
  { value: 'vendor_conversations', label: 'Vendor Conversations' },
  { value: 'cma_delivered', label: 'CMA Delivered' },
];

export default function ReviewRoadmap() {
  const { currentQuarter } = useFinancialYear();
  const { hasAnyRole } = useAuth();
  
  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarter.quarter);
  const [selectedYear, setSelectedYear] = useState(currentQuarter.year);
  
  const { goals, loading: goalsLoading, createGoal, calculatePerformance } = useQuarterlyGoals(selectedQuarter, selectedYear);
  const { review, saveReview, completeReview } = useQuarterlyReview(selectedQuarter, selectedYear);
  
  const [reviewForm, setReviewForm] = useState({
    wins: review?.wins || '',
    challenges: review?.challenges || '',
    lessons_learned: review?.lessons_learned || '',
    action_items: review?.action_items || ''
  });

  const [newGoalDialogOpen, setNewGoalDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    kpi_type: '',
    target_value: 0,
    goal_type: 'individual' as 'individual' | 'team'
  });

  const [performance, setPerformance] = useState<Record<string, number>>({});

  useState(() => {
    calculatePerformance().then(setPerformance);
  });

  const handleSaveReview = async () => {
    await saveReview(reviewForm);
  };

  const handleCreateGoal = async () => {
    if (!newGoal.kpi_type || newGoal.target_value <= 0) return;
    
    await createGoal({
      kpi_type: newGoal.kpi_type,
      target_value: newGoal.target_value,
      goal_type: newGoal.goal_type,
      user_id: newGoal.goal_type === 'individual' ? null : null,
      quarter: selectedQuarter,
      year: selectedYear
    });
    
    setNewGoalDialogOpen(false);
    setNewGoal({ kpi_type: '', target_value: 0, goal_type: 'individual' });
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="bg-gradient-to-br from-blue-50/30 to-white dark:from-blue-900/5 dark:to-background p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <BookOpen className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Review & Roadmap</h1>
              <p className="text-muted-foreground">
                Reflect on your performance and plan for the future
              </p>
            </div>
          </div>
          <QuarterSelector
          quarter={selectedQuarter}
          year={selectedYear}
          onQuarterChange={(q, y) => {
            setSelectedQuarter(q);
            setSelectedYear(y);
          }}
        />
        </div>
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="current">Current Quarter</TabsTrigger>
          <TabsTrigger value="review">Quarterly Review</TabsTrigger>
          <TabsTrigger value="past">Past Quarters</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4 mt-6">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-xl transition-all">
            <CardHeader className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    Quarterly Goals
                  </CardTitle>
                  <CardDescription>
                    Track your progress toward this quarter's goals
                  </CardDescription>
                </div>
                {hasAnyRole(['platform_admin', 'office_manager', 'team_leader']) && (
                  <Dialog open={newGoalDialogOpen} onOpenChange={setNewGoalDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Goal
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Goal</DialogTitle>
                        <DialogDescription>
                          Set a new goal for this quarter
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>KPI Type</Label>
                          <Select value={newGoal.kpi_type} onValueChange={(v) => setNewGoal({ ...newGoal, kpi_type: v })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select KPI" />
                            </SelectTrigger>
                            <SelectContent>
                              {KPI_TYPES.map((kpi) => (
                                <SelectItem key={kpi.value} value={kpi.value}>
                                  {kpi.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Target Value</Label>
                          <Input 
                            type="number" 
                            value={newGoal.target_value}
                            onChange={(e) => setNewGoal({ ...newGoal, target_value: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div>
                          <Label>Goal Type</Label>
                          <Select value={newGoal.goal_type} onValueChange={(v: 'individual' | 'team') => setNewGoal({ ...newGoal, goal_type: v })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="individual">Individual</SelectItem>
                              <SelectItem value="team">Team</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button onClick={handleCreateGoal} className="w-full">
                          Create Goal
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {goalsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : goals.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {goals.map((goal) => (
                    <QuarterlyGoalCard 
                      key={goal.id} 
                      goal={goal}
                      actualValue={performance[goal.kpi_type] || 0}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No goals set for this quarter yet. {hasAnyRole(['platform_admin', 'office_manager', 'team_leader']) && 'Click "Add Goal" to create one.'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="space-y-4 mt-6">
          <Card className="border-l-4 border-l-blue-500 hover:shadow-xl transition-all">
            <CardHeader className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                Quarterly Review
              </CardTitle>
              <CardDescription>
                Reflect on your performance and identify areas for improvement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="wins">Wins & Achievements</Label>
                <Textarea 
                  id="wins"
                  placeholder="What went well this quarter? What are you proud of?"
                  value={reviewForm.wins}
                  onChange={(e) => setReviewForm({ ...reviewForm, wins: e.target.value })}
                  rows={4}
                />
              </div>
              
              <div>
                <Label htmlFor="challenges">Challenges & Obstacles</Label>
                <Textarea 
                  id="challenges"
                  placeholder="What challenges did you face? What obstacles got in the way?"
                  value={reviewForm.challenges}
                  onChange={(e) => setReviewForm({ ...reviewForm, challenges: e.target.value })}
                  rows={4}
                />
              </div>
              
              <div>
                <Label htmlFor="lessons">Lessons Learned</Label>
                <Textarea 
                  id="lessons"
                  placeholder="What did you learn? What would you do differently?"
                  value={reviewForm.lessons_learned}
                  onChange={(e) => setReviewForm({ ...reviewForm, lessons_learned: e.target.value })}
                  rows={4}
                />
              </div>
              
              <div>
                <Label htmlFor="actions">Action Items for Next Quarter</Label>
                <Textarea 
                  id="actions"
                  placeholder="What specific actions will you take next quarter?"
                  value={reviewForm.action_items}
                  onChange={(e) => setReviewForm({ ...reviewForm, action_items: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSaveReview}>
                  Save Progress
                </Button>
                {!review?.completed && (
                  <Button onClick={completeReview} variant="default">
                    Complete Review
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="past" className="space-y-4 mt-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                Historical Performance
              </CardTitle>
              <CardDescription>
                Compare your performance across quarters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Historical comparison chart coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
