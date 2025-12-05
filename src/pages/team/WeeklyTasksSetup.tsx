import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2, GripVertical, Calendar, Sparkles } from 'lucide-react';
import { useWeeklyTaskSettings, DEFAULT_TEMPLATES, getDayName, type WeeklyTaskTemplate } from '@/hooks/useWeeklyTaskSettings';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type WizardStep = 'enable' | 'configure' | 'confirm';

export default function WeeklyTasksSetup() {
  const navigate = useNavigate();
  const { settings, templates, isEnabled, enableFeature, addTemplate, updateTemplate, deleteTemplate, seedDefaultTemplates, isLoading } = useWeeklyTaskSettings();
  
  const [step, setStep] = useState<WizardStep>('enable');
  const [localEnabled, setLocalEnabled] = useState(isEnabled);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDay, setNewTaskDay] = useState<number>(1);

  const handleEnableToggle = (enabled: boolean) => {
    setLocalEnabled(enabled);
    enableFeature(enabled);
  };

  const handleLoadDefaults = async () => {
    await seedDefaultTemplates();
    toast.success('Loaded default weekly tasks');
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    
    addTemplate({
      title: newTaskTitle.trim(),
      description: null,
      day_of_week: newTaskDay,
      default_size_category: 'medium',
      position: templates.length,
      is_active: true,
    });
    
    setNewTaskTitle('');
  };

  const handleDayChange = (templateId: string, day: number) => {
    updateTemplate({ id: templateId, updates: { day_of_week: day } });
  };

  const handleSizeChange = (templateId: string, size: 'big' | 'medium' | 'little') => {
    updateTemplate({ id: templateId, updates: { default_size_category: size } });
  };

  const handleToggleActive = (templateId: string, isActive: boolean) => {
    updateTemplate({ id: templateId, updates: { is_active: isActive } });
  };

  const handleComplete = () => {
    toast.success('Weekly listing tasks configured!');
    navigate('/team-leader');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(['enable', 'configure', 'confirm'] as WizardStep[]).map((s, i) => (
          <div key={s} className="flex items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                step === s ? 'bg-primary text-primary-foreground' : 
                i < ['enable', 'configure', 'confirm'].indexOf(step) ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
              )}
            >
              {i < ['enable', 'configure', 'confirm'].indexOf(step) ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < 2 && <div className={cn('w-16 h-0.5 mx-2', i < ['enable', 'configure', 'confirm'].indexOf(step) ? 'bg-primary' : 'bg-muted')} />}
          </div>
        ))}
      </div>

      {/* Step 1: Enable */}
      {step === 'enable' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Listing Tasks
            </CardTitle>
            <CardDescription>
              Automatically generate recurring tasks for your active listings each week. 
              Perfect for consistent buyer follow-ups, vendor reports, and campaign updates.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label className="text-base font-medium">Enable Weekly Tasks</Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, tasks will be auto-generated every Monday for your active listings
                </p>
              </div>
              <Switch checked={localEnabled} onCheckedChange={handleEnableToggle} />
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">How it works:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Configure which tasks you want generated each week</li>
                <li>• Tasks appear in Daily Planner's Triage Queue on assigned days</li>
                <li>• Each active listing gets its own set of tasks (e.g., "Buyer Callbacks: 123 Smith St")</li>
                <li>• Incomplete tasks roll forward like normal tasks</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep('configure')} disabled={!localEnabled}>
                Next: Configure Tasks
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configure */}
      {step === 'configure' && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Weekly Tasks</CardTitle>
            <CardDescription>
              Define which tasks should be generated for each listing. Set the day of week and priority.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {templates.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Sparkles className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground mb-4">No tasks configured yet</p>
                <Button variant="outline" onClick={handleLoadDefaults}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Load Suggested Tasks
                </Button>
              </div>
            )}

            {templates.length > 0 && (
              <div className="space-y-2">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className={cn(
                      'flex items-center gap-3 p-3 border rounded-lg',
                      !template.is_active && 'opacity-50'
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                    
                    <Switch
                      checked={template.is_active}
                      onCheckedChange={(checked) => handleToggleActive(template.id, checked)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{template.title}</p>
                    </div>

                    <Select
                      value={template.day_of_week.toString()}
                      onValueChange={(v) => handleDayChange(template.id, parseInt(v))}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {getDayName(day)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={template.default_size_category}
                      onValueChange={(v) => handleSizeChange(template.id, v as any)}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="big">Big</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="little">Quick</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new task */}
            <div className="flex items-center gap-2 pt-4 border-t">
              <Input
                placeholder="Add custom task..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                className="flex-1"
              />
              <Select value={newTaskDay.toString()} onValueChange={(v) => setNewTaskDay(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {getDayName(day)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAddTask} disabled={!newTaskTitle.trim()}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('enable')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={() => setStep('confirm')} disabled={templates.length === 0}>
                Next: Review
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Review & Confirm
            </CardTitle>
            <CardDescription>
              Here's a summary of your weekly task configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-3">Weekly Tasks Summary</h4>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                  const dayTasks = templates.filter(t => t.day_of_week === day && t.is_active);
                  if (dayTasks.length === 0) return null;
                  
                  return (
                    <div key={day} className="flex items-start gap-3">
                      <Badge variant="outline" className="min-w-20 justify-center">
                        {getDayName(day)}
                      </Badge>
                      <div className="flex flex-wrap gap-1">
                        {dayTasks.map((task) => (
                          <Badge key={task.id} variant="secondary" className="text-xs">
                            {task.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
              <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">What happens next?</h4>
              <ul className="text-sm text-green-600 dark:text-green-500 space-y-1">
                <li>• Tasks will be generated every Monday at 7am</li>
                <li>• Each active listing will get its own set of tasks</li>
                <li>• Tasks appear in your Daily Planner's Triage Queue</li>
                <li>• You'll receive a notification when tasks are generated</li>
              </ul>
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('configure')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleComplete}>
                <Check className="mr-2 h-4 w-4" />
                Complete Setup
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
