import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Phone, MessageSquare, Home, Calendar, TrendingUp, DollarSign, Check, Lock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { calculateCCH } from '@/lib/cchCalculations';
import { format, startOfWeek, addDays, isAfter, isSameDay } from 'date-fns';
import { useStreak } from '@/hooks/useStreak';
import { useStreakMilestones } from '@/hooks/useStreakMilestones';

const kpiConfig = [
  { type: 'calls', label: 'Calls', icon: Phone },
  { type: 'appraisals', label: 'Appraisals', icon: Calendar },
  { type: 'open_homes', label: 'Open Homes', icon: Home },
];

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

interface WeeklyLogData {
  [date: string]: {
    calls: number;
    appraisals: number;
    open_homes: number;
  };
}

const WeeklyLogs = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { streakData, refetch: refetchStreak } = useStreak();
  const { checkAndCelebrate } = useStreakMilestones();
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyLogData>({});
  const [loggedDates, setLoggedDates] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [currentValues, setCurrentValues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    initializeWeek();
  }, []);

  useEffect(() => {
    if (weekDates.length > 0 && user) {
      fetchWeeklyData();
    }
  }, [weekDates, user]);

  useEffect(() => {
    if (selectedDate && weeklyData[selectedDate]) {
      setCurrentValues(weeklyData[selectedDate]);
    } else {
      setCurrentValues({});
    }
  }, [selectedDate, weeklyData]);

  const initializeWeek = () => {
    const today = new Date();
    const monday = startOfWeek(today, { weekStartsOn: 1 });
    const dates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
    setWeekDates(dates);
    
    const todayStr = format(today, 'yyyy-MM-dd');
    setSelectedDate(todayStr);
  };

  const fetchWeeklyData = async () => {
    if (!user || weekDates.length === 0) return;
    
    setFetchingData(true);
    const mondayStr = format(weekDates[0], 'yyyy-MM-dd');
    const sundayStr = format(weekDates[6], 'yyyy-MM-dd');

    try {
      // Fetch KPI entries using 'date' column
      const { data: kpiData } = await (supabase as any)
        .from('kpi_entries')
        .select('date, kpi_type, value')
        .eq('user_id', user.id)
        .gte('date', mondayStr)
        .lte('date', sundayStr);

      // Organize data by date
      const organized: WeeklyLogData = {};
      if (kpiData) {
        kpiData.forEach((entry: any) => {
          const dateKey = entry.date;
          if (!organized[dateKey]) {
            organized[dateKey] = {
              calls: 0,
              appraisals: 0,
              open_homes: 0,
            };
          }
          if (entry.kpi_type in organized[dateKey]) {
            (organized[dateKey] as any)[entry.kpi_type] = entry.value;
          }
        });
      }

      setWeeklyData(organized);

      // Track which dates have data (logged)
      const logged = new Set<string>(Object.keys(organized).filter(
        date => organized[date].calls > 0 || organized[date].appraisals > 0 || organized[date].open_homes > 0
      ));
      setLoggedDates(logged);
    } catch (error) {
      console.error('Error fetching weekly data:', error);
    } finally {
      setFetchingData(false);
    }
  };

  const handleSaveDay = async () => {
    if (!user || !selectedDate) return;

    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
    if (isAfter(selectedDateObj, new Date())) {
      toast({
        title: 'Invalid Date',
        description: "You can't log data for future dates",
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // Upsert KPI entries using 'date' column
      for (const [kpiType, value] of Object.entries(currentValues)) {
        if (value === undefined || value === null) continue;

        await (supabase as any)
          .from('kpi_entries')
          .upsert([{
            user_id: user.id,
            kpi_type: kpiType,
            value: Number(value),
            date: selectedDate,
          }], {
            onConflict: 'user_id,kpi_type,date',
          });
      }

      toast({
        title: 'Success!',
        description: `Numbers saved for ${format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d')}`,
      });

      await fetchWeeklyData();
      await refetchStreak();
      
      setTimeout(() => {
        checkAndCelebrate(streakData.currentStreak);
      }, 500);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save numbers',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const cchPreview = calculateCCH(
    currentValues.calls || 0,
    currentValues.appraisals || 0,
    currentValues.open_homes || 0
  );

  if (fetchingData) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Weekly Logs</h1>
          <p className="text-muted-foreground">Loading your weekly data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 md:pb-8 max-w-4xl mx-auto">
      <div className="bg-gradient-to-br from-blue-50/30 to-white dark:from-blue-900/5 dark:to-background p-6 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
            <Calendar className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Weekly Logs</h1>
            <p className="text-muted-foreground">
              Log or update your numbers for this week
            </p>
          </div>
        </div>
      </div>

      <Tabs value={selectedDate} onValueChange={setSelectedDate}>
        <TabsList className="grid grid-cols-7 w-full h-auto bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
          {weekDates.map((date, index) => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const isToday = isSameDay(date, new Date());
            const isFuture = isAfter(date, new Date());
            const hasData = loggedDates.has(dateStr);
            const isPast = !isFuture && !isToday;
            const needsData = isPast && !hasData;

            return (
              <TabsTrigger
                key={dateStr}
                value={dateStr}
                disabled={isFuture}
                className="relative h-auto py-3"
              >
                <div className="flex flex-col items-center justify-center gap-1.5">
                  <span className={isToday ? 'font-bold' : ''}>{weekDays[index].slice(0, 3)}</span>
                  <div className="h-4 flex items-center justify-center">
                    {isFuture && <div className="p-1 rounded bg-muted"><Lock className="h-3 w-3 text-muted-foreground" /></div>}
                    {hasData && !isFuture && <div className="p-1 rounded bg-green-100 dark:bg-green-900/30"><Check className="h-3 w-3 text-green-600 dark:text-green-400" /></div>}
                    {needsData && <div className="p-1 rounded bg-red-100 dark:bg-red-900/30"><AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400" /></div>}
                  </div>
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {weekDates.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const isFuture = isAfter(date, new Date());

          return (
            <TabsContent key={dateStr} value={dateStr} className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-semibold">
                    {format(date, 'EEEE, MMMM d, yyyy')}
                  </h2>
                  {isFuture && (
                    <Badge variant="secondary">Future Date</Badge>
                  )}
                </div>

                <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all">
                  <CardHeader className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
                    <CardTitle className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                        <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      Daily Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-6">
                    {kpiConfig.map((kpi) => {
                      const Icon = kpi.icon;
                      return (
                        <div key={kpi.type} className="space-y-2">
                          <Label htmlFor={`${dateStr}-${kpi.type}`} className="flex items-center space-x-2">
                            <Icon className="h-4 w-4" />
                            <span>{kpi.label}</span>
                          </Label>
                          <Input
                            id={`${dateStr}-${kpi.type}`}
                            type="number"
                            min="0"
                            disabled={isFuture}
                            value={currentValues[kpi.type] || ''}
                            onChange={(e) => setCurrentValues({ 
                              ...currentValues, 
                              [kpi.type]: parseInt(e.target.value) || 0 
                            })}
                            placeholder="0"
                          />
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">CCH for this day:</span>
                      <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">{cchPreview.total.toFixed(1)} hrs</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex space-x-4">
                  <Button type="button" variant="outline" onClick={() => navigate('/')} className="flex-1">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSaveDay} 
                    disabled={loading || isFuture} 
                    className="flex-1"
                  >
                    {loading ? 'Saving...' : `Save ${format(date, 'EEEE')}'s Data`}
                  </Button>
                </div>
              </div>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default WeeklyLogs;
