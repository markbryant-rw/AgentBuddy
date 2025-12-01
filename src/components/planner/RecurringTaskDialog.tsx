import { useState } from 'react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RecurringTemplate } from '@/hooks/useRecurringTasks';
import { Calendar, Info } from 'lucide-react';

interface RecurringTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (template: Omit<RecurringTemplate, 'id' | 'created_at' | 'updated_at' | 'last_generated_date'>) => void;
}

export function RecurringTaskDialog({ open, onOpenChange, onSave }: RecurringTaskDialogProps) {
  const [title, setTitle] = useState('');
  const [sizeCategory, setSizeCategory] = useState<'big' | 'medium' | 'little'>('medium');
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [recurrenceType, setRecurrenceType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [selectedWeekDays, setSelectedWeekDays] = useState<number[]>([]);
  const [selectedMonthDays, setSelectedMonthDays] = useState<number[]>([]);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [hasEndDate, setHasEndDate] = useState(false);
  const [endDate, setEndDate] = useState('');

  const weekDays = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 7, label: 'Sun' },
  ];

  const handleSubmit = () => {
    const recurrenceDays =
      recurrenceType === 'weekly' ? selectedWeekDays :
      recurrenceType === 'monthly' ? selectedMonthDays :
      null;

    onSave({
      team_id: '', // Set by hook
      title,
      size_category: sizeCategory,
      estimated_minutes: estimatedMinutes || null,
      notes: notes || null,
      recurrence_type: recurrenceType,
      recurrence_days: recurrenceDays,
      start_date: startDate,
      end_date: hasEndDate ? endDate : null,
      created_by: '', // Set by hook
      is_active: true,
    });

    // Reset form
    setTitle('');
    setSizeCategory('medium');
    setEstimatedMinutes(undefined);
    setNotes('');
    setRecurrenceType('daily');
    setSelectedWeekDays([]);
    setSelectedMonthDays([]);
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setHasEndDate(false);
    setEndDate('');
    onOpenChange(false);
  };

  const getNextOccurrences = () => {
    const occurrences: Date[] = [];
    let current = new Date(startDate);
    const maxOccurrences = 5;

    if (recurrenceType === 'daily') {
      for (let i = 0; i < maxOccurrences; i++) {
        occurrences.push(new Date(current));
        current = addDays(current, 1);
      }
    } else if (recurrenceType === 'weekly' && selectedWeekDays.length > 0) {
      let iterations = 0;
      while (occurrences.length < maxOccurrences && iterations < 100) {
        const dayOfWeek = current.getDay() === 0 ? 7 : current.getDay();
        if (selectedWeekDays.includes(dayOfWeek)) {
          occurrences.push(new Date(current));
        }
        current = addDays(current, 1);
        iterations++;
      }
    } else if (recurrenceType === 'monthly' && selectedMonthDays.length > 0) {
      let iterations = 0;
      while (occurrences.length < maxOccurrences && iterations < 365) {
        const dayOfMonth = current.getDate();
        if (selectedMonthDays.includes(dayOfMonth)) {
          occurrences.push(new Date(current));
        }
        current = addDays(current, 1);
        iterations++;
      }
    }

    return occurrences;
  };

  const nextOccurrences = getNextOccurrences();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Recurring Task</DialogTitle>
          <DialogDescription>
            Set up a task that automatically appears on your planner
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning team standup"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={sizeCategory} onValueChange={(v: any) => setSizeCategory(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="big">High-Impact (60+ min)</SelectItem>
                  <SelectItem value="medium">Important (30-60 min)</SelectItem>
                  <SelectItem value="little">Quick Win (&lt;15 min)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minutes">Estimated Time (minutes)</Label>
              <Input
                id="minutes"
                type="number"
                value={estimatedMinutes || ''}
                onChange={(e) => setEstimatedMinutes(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="e.g., 30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional details..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Recurrence Pattern</Label>
            <Select value={recurrenceType} onValueChange={(v: any) => setRecurrenceType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly (specific days)</SelectItem>
                <SelectItem value="monthly">Monthly (specific dates)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {recurrenceType === 'weekly' && (
            <div className="space-y-2">
              <Label>Select Days</Label>
              <div className="flex gap-2">
                {weekDays.map((day) => (
                  <div key={day.value} className="flex items-center space-x-1">
                    <Checkbox
                      id={`day-${day.value}`}
                      checked={selectedWeekDays.includes(day.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedWeekDays([...selectedWeekDays, day.value]);
                        } else {
                          setSelectedWeekDays(selectedWeekDays.filter(d => d !== day.value));
                        }
                      }}
                    />
                    <label htmlFor={`day-${day.value}`} className="text-sm cursor-pointer">
                      {day.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recurrenceType === 'monthly' && (
            <div className="space-y-2">
              <Label>Select Dates</Label>
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                  <div key={day} className="flex items-center space-x-1">
                    <Checkbox
                      id={`date-${day}`}
                      checked={selectedMonthDays.includes(day)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMonthDays([...selectedMonthDays, day]);
                        } else {
                          setSelectedMonthDays(selectedMonthDays.filter(d => d !== day));
                        }
                      }}
                    />
                    <label htmlFor={`date-${day}`} className="text-sm cursor-pointer">
                      {day}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasEndDate"
                  checked={hasEndDate}
                  onCheckedChange={(checked) => setHasEndDate(checked as boolean)}
                />
                <Label htmlFor="hasEndDate">Set End Date</Label>
              </div>
              {hasEndDate && (
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                />
              )}
            </div>
          </div>

          {nextOccurrences.length > 0 && (
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Calendar className="h-4 w-4" />
                Next 5 Occurrences:
              </div>
              <div className="text-sm text-muted-foreground">
                {nextOccurrences.map((date, i) => (
                  <div key={i}>{format(date, 'EEE, MMM d, yyyy')}</div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              Recurring tasks will automatically appear on the specified dates. 
              They will be marked with a 🔄 symbol and won't be rolled forward with other tasks.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={
              !title.trim() || 
              (recurrenceType === 'weekly' && selectedWeekDays.length === 0) ||
              (recurrenceType === 'monthly' && selectedMonthDays.length === 0)
            }
          >
            Create Recurring Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
