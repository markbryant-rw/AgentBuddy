import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useCreatePost } from '@/hooks/useSocialPosts';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, Globe, Users, UserPlus, Building2 } from 'lucide-react';

interface WeeklyReflectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Mood = 'great' | 'good' | 'okay' | 'challenging' | 'tough';
type Visibility = 'public' | 'team_only' | 'friends_only' | 'office_only';

const moodOptions: { value: Mood; emoji: string; label: string }[] = [
  { value: 'great', emoji: '😄', label: 'Great!' },
  { value: 'good', emoji: '😊', label: 'Good' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'challenging', emoji: '😓', label: 'Challenging' },
  { value: 'tough', emoji: '😞', label: 'Tough' },
];

const visibilityOptions: { value: Visibility; icon: any; label: string }[] = [
  { value: 'public', icon: Globe, label: 'Public' },
  { value: 'team_only', icon: Users, label: 'Team Only' },
  { value: 'friends_only', icon: UserPlus, label: 'Friends Only' },
  { value: 'office_only', icon: Building2, label: 'Office Only' },
];

export function WeeklyReflectionModal({ open, onOpenChange }: WeeklyReflectionModalProps) {
  const { user } = useAuth();
  const createPost = useCreatePost();
  
  const [mood, setMood] = useState<Mood>('good');
  const [weekHighlights, setWeekHighlights] = useState('');
  const [challengesFaced, setChallengesFaced] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [nextWeekGoals, setNextWeekGoals] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('team_only');

  // Fetch KPI summary for this week
  const { data: kpiSummary } = useQuery({
    queryKey: ['kpi-week-summary', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from('kpi_entries' as any)
        .select('*')
        .eq('user_id', user.id)
        .gte('entry_date', startOfWeek.toISOString())
        .lte('entry_date', new Date().toISOString());

      if (!data || data.length === 0) return null;

      const entries = data as any[];
      return {
        calls: entries.reduce((sum, entry) => sum + (entry.calls || 0), 0),
        appraisals: entries.reduce((sum, entry) => sum + (entry.appraisals || 0), 0),
        listings_won: entries.reduce((sum, entry) => sum + (entry.listings_won || 0), 0),
        open_homes: entries.reduce((sum, entry) => sum + (entry.open_homes || 0), 0),
      };
    },
    enabled: !!user && open,
  });

  // Load draft from localStorage
  useEffect(() => {
    if (open) {
      const draft = localStorage.getItem('weekly-reflection-draft');
      if (draft) {
        try {
          const parsed = JSON.parse(draft);
          setMood(parsed.mood || 'good');
          setWeekHighlights(parsed.weekHighlights || '');
          setChallengesFaced(parsed.challengesFaced || '');
          setLessonsLearned(parsed.lessonsLearned || '');
          setNextWeekGoals(parsed.nextWeekGoals || '');
          setVisibility(parsed.visibility || 'team_only');
        } catch (e) {
          console.error('Failed to parse draft', e);
        }
      }
    }
  }, [open]);

  // Auto-save draft
  useEffect(() => {
    if (open) {
      const draft = {
        mood,
        weekHighlights,
        challengesFaced,
        lessonsLearned,
        nextWeekGoals,
        visibility,
      };
      localStorage.setItem('weekly-reflection-draft', JSON.stringify(draft));
    }
  }, [open, mood, weekHighlights, challengesFaced, lessonsLearned, nextWeekGoals, visibility]);

  const handleSubmit = async () => {
    if (!weekHighlights.trim()) {
      toast.error('Please share at least one highlight from your week');
      return;
    }

    const reflectionData = {
      week_highlights: weekHighlights,
      challenges_faced: challengesFaced,
      lessons_learned: lessonsLearned,
      next_week_goals: nextWeekGoals,
      kpi_summary: kpiSummary,
    };

    const content = `**How was my week?** 🌟\n\n${mood === 'great' ? '😄' : mood === 'good' ? '😊' : mood === 'okay' ? '😐' : mood === 'challenging' ? '😓' : '😞'} Overall: ${moodOptions.find(m => m.value === mood)?.label}\n\n**Highlights:** ${weekHighlights}${challengesFaced ? `\n\n**Challenges:** ${challengesFaced}` : ''}${lessonsLearned ? `\n\n**Lessons Learned:** ${lessonsLearned}` : ''}${nextWeekGoals ? `\n\n**Next Week Goals:** ${nextWeekGoals}` : ''}`;

    try {
      await createPost.mutateAsync({
        post_type: 'weekly_reflection',
        content,
        mood,
        reflection_data: reflectionData,
        visibility,
      });

      // Clear draft
      localStorage.removeItem('weekly-reflection-draft');
      
      toast.success('Weekly reflection shared!');
      onOpenChange(false);
      
      // Reset form
      setMood('good');
      setWeekHighlights('');
      setChallengesFaced('');
      setLessonsLearned('');
      setNextWeekGoals('');
      setVisibility('team_only');
    } catch (error) {
      toast.error('Failed to share reflection');
    }
  };

  const handleSkip = () => {
    localStorage.removeItem('weekly-reflection-draft');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            How was your week?
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Mood Selector */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">How are you feeling?</Label>
            <div className="flex gap-2 flex-wrap">
              {moodOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={mood === option.value ? 'default' : 'outline'}
                  size="lg"
                  onClick={() => setMood(option.value)}
                  className="flex-1 min-w-[100px]"
                >
                  <span className="text-2xl mr-2">{option.emoji}</span>
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* KPI Summary */}
          {kpiSummary && (
            <div className="p-4 bg-muted rounded-lg">
              <Label className="text-sm font-semibold mb-2 block">Your Week at a Glance</Label>
              <div className="flex gap-3 flex-wrap">
                <Badge variant="secondary">📞 {kpiSummary.calls} calls</Badge>
                <Badge variant="secondary">🏠 {kpiSummary.appraisals} appraisals</Badge>
                {kpiSummary.listings_won > 0 && (
                  <Badge variant="secondary">✅ {kpiSummary.listings_won} listings</Badge>
                )}
                {kpiSummary.open_homes > 0 && (
                  <Badge variant="secondary">🚪 {kpiSummary.open_homes} open homes</Badge>
                )}
              </div>
            </div>
          )}

          {/* Reflection Questions */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="highlights" className="text-base font-semibold">
                What went well this week? *
              </Label>
              <Textarea
                id="highlights"
                placeholder="Share your wins, achievements, or positive moments..."
                value={weekHighlights}
                onChange={(e) => setWeekHighlights(e.target.value)}
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">
                {weekHighlights.length}/500
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="challenges" className="text-base font-semibold">
                What was challenging?
              </Label>
              <Textarea
                id="challenges"
                placeholder="Any obstacles or difficulties you faced..."
                value={challengesFaced}
                onChange={(e) => setChallengesFaced(e.target.value)}
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">
                {challengesFaced.length}/500
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lessons" className="text-base font-semibold">
                Key lessons learned?
              </Label>
              <Textarea
                id="lessons"
                placeholder="What insights or learnings did you gain..."
                value={lessonsLearned}
                onChange={(e) => setLessonsLearned(e.target.value)}
                maxLength={300}
                rows={2}
              />
              <p className="text-xs text-muted-foreground text-right">
                {lessonsLearned.length}/300
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals" className="text-base font-semibold">
                Goals for next week?
              </Label>
              <Textarea
                id="goals"
                placeholder="What do you want to focus on or achieve..."
                value={nextWeekGoals}
                onChange={(e) => setNextWeekGoals(e.target.value)}
                maxLength={300}
                rows={2}
              />
              <p className="text-xs text-muted-foreground text-right">
                {nextWeekGoals.length}/300
              </p>
            </div>
          </div>

          {/* Visibility Selector */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Who can see this?</Label>
            <RadioGroup value={visibility} onValueChange={(v) => setVisibility(v as Visibility)}>
              <div className="grid grid-cols-2 gap-3">
                {visibilityOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Label
                      key={option.value}
                      htmlFor={option.value}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        visibility === option.value ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium">{option.label}</span>
                    </Label>
                  );
                })}
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleSkip}>
            Skip This Week
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!weekHighlights.trim() || createPost.isPending}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Share Reflection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
