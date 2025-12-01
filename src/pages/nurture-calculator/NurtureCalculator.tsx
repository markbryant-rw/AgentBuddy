import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { TrendingUp, Database, DollarSign, Phone, Users, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const NurtureCalculator = () => {
  const { user } = useAuth();
  const [dailyCalls, setDailyCalls] = useState<number>(25);
  const [callingDays, setCallingDays] = useState<number>(4);
  const [usePipelineTargets, setUsePipelineTargets] = useState<boolean>(false);
  const [weeklyCallsTarget, setWeeklyCallsTarget] = useState<number>(0);

  // Fetch pipeline targets
  useEffect(() => {
    const fetchPipelineTargets = async () => {
      if (!user) return;

      const { data } = await supabase
        .from('goals')
        .select('kpi_type, target_value')
        .eq('user_id', user.id)
        .eq('period', 'weekly')
        .eq('kpi_type', 'calls')
        .maybeSingle();

      if (data) {
        setWeeklyCallsTarget(data.target_value);
      }
    };

    fetchPipelineTargets();
  }, [user]);

  // Calculate daily calls from weekly target when using pipeline targets
  useEffect(() => {
    if (usePipelineTargets && weeklyCallsTarget > 0) {
      const calculatedDailyCalls = Math.round(weeklyCallsTarget / callingDays);
      setDailyCalls(calculatedDailyCalls);
    }
  }, [usePipelineTargets, weeklyCallsTarget, callingDays]);

  // Constants for calculations
  const WORKING_WEEKS = 50;
  const CONNECTION_RATE = 0.50; // 50% of calls result in connection
  const CONVERSION_RATE = 0.05; // 5% of connections convert to appraisal
  const TOUCHES_PER_YEAR = 4; // 4 touches per contact per year
  const NATURAL_TURNOVER_RATE = 0.05; // 5% annual turnover
  const AVG_GCI_PER_LISTING = 25000; // $25,000 average GCI

  // Calculations
  const callsPerWeek = dailyCalls * callingDays;
  const callsPerMonth = Math.round((callsPerWeek * WORKING_WEEKS) / 12);
  const callsPerYear = callsPerWeek * WORKING_WEEKS;

  const connectionsPerDay = Math.round(dailyCalls * CONNECTION_RATE);
  const connectionsPerWeek = Math.round(callsPerWeek * CONNECTION_RATE);
  const connectionsPerMonth = Math.round(callsPerMonth * CONNECTION_RATE);
  const connectionsPerYear = Math.round(callsPerYear * CONNECTION_RATE);

  const conversionsPerDay = Math.round(connectionsPerDay * CONVERSION_RATE);
  const conversionsPerWeek = Math.round(connectionsPerWeek * CONVERSION_RATE);
  const conversionsPerMonth = Math.round(connectionsPerMonth * CONVERSION_RATE);
  const conversionsPerYear = Math.round(connectionsPerYear * CONVERSION_RATE);

  // Recommended database size = calls per year / touches per year
  const recommendedDatabaseSize = Math.round(callsPerYear / TOUCHES_PER_YEAR);

  // Annual revenue = 5% of database * $25k per listing
  const annualRevenueOpportunity = Math.round(recommendedDatabaseSize * NATURAL_TURNOVER_RATE * AVG_GCI_PER_LISTING);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 p-8 md:p-12 text-white">
        <div className="relative z-10 text-center space-y-4">
          <div className="mx-auto w-fit rounded-2xl bg-white/20 backdrop-blur-sm p-4">
            <TrendingUp className="h-12 w-12" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            Nurture Database Calculator
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            Discover how many prospects you can realistically nurture based on your daily calling commitment
          </p>
        </div>
      </div>

      {/* Input Section */}
      <Card>
        <CardContent className="p-6 md:p-8 space-y-6">
          <h2 className="text-2xl font-bold text-center">Set Your Calling Schedule</h2>
          
          {/* Use Pipeline Targets Checkbox */}
          <div className="flex items-center space-x-2 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="use-pipeline"
              checked={usePipelineTargets}
              onCheckedChange={(checked) => setUsePipelineTargets(checked as boolean)}
            />
            <Label
              htmlFor="use-pipeline"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Use Pipeline Progress Targets
              {weeklyCallsTarget > 0 && (
                <span className="ml-2 text-muted-foreground">
                  (Weekly target: {weeklyCallsTarget} calls)
                </span>
              )}
            </Label>
          </div>
          
          {/* Daily Calls Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Daily Calls</label>
            <Input
              type="number"
              min="1"
              value={dailyCalls}
              onChange={(e) => setDailyCalls(Math.max(1, parseInt(e.target.value) || 1))}
              placeholder="Enter number of calls per day"
              className="text-center text-lg"
              disabled={usePipelineTargets}
            />
            {usePipelineTargets && (
              <p className="text-xs text-muted-foreground text-center">
                Automatically calculated from your weekly target
              </p>
            )}
          </div>

          {/* Calling Days Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Calling Days Per Week</label>
            <div className="grid grid-cols-3 gap-3">
              {[3, 4, 5].map((days) => (
                <Button
                  key={days}
                  variant={callingDays === days ? "default" : "outline"}
                  onClick={() => setCallingDays(days)}
                  className="text-lg font-semibold"
                >
                  {days} Days
                </Button>
              ))}
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            Based on a 50-week calling year
          </p>
        </CardContent>
      </Card>

      {/* Results - Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-cyan-500/10 to-teal-500/10 border-cyan-200">
          <CardContent className="p-6 text-center space-y-3">
            <div className="mx-auto w-fit rounded-xl bg-white p-3">
              <Database className="h-8 w-8 text-cyan-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-muted-foreground">
                Recommended Database Limit
              </p>
              <p className="text-4xl md:text-5xl font-bold text-cyan-600">
                {formatNumber(recommendedDatabaseSize)} contacts
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Maximum contacts to nurture effectively with {TOUCHES_PER_YEAR} touches per year
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-200">
          <CardContent className="p-6 text-center space-y-3">
            <div className="mx-auto w-fit rounded-xl bg-white p-3">
              <DollarSign className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <p className="text-lg font-medium text-muted-foreground">
                Annual Revenue Opportunity
              </p>
              <p className="text-4xl md:text-5xl font-bold text-emerald-600">
                {formatCurrency(annualRevenueOpportunity)}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Natural turnover from your database (5% annually at {formatCurrency(AVG_GCI_PER_LISTING)} per listing)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Metrics */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold">Daily Metrics</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Calls per day</p>
                  <p className="text-3xl font-bold">{dailyCalls}</p>
                </div>
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Connections per day</p>
                  <p className="text-3xl font-bold">{connectionsPerDay}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Conversions (Appraisal Opportunities) per day</p>
                  <p className="text-3xl font-bold">{conversionsPerDay}</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Weekly Metrics */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold">Weekly Metrics</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Calls per week</p>
                  <p className="text-3xl font-bold">{callsPerWeek}</p>
                </div>
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Connections per week</p>
                  <p className="text-3xl font-bold">{connectionsPerWeek}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Conversions (Appraisal Opportunities) per week</p>
                  <p className="text-3xl font-bold">{conversionsPerWeek}</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Monthly Metrics */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold">Monthly Metrics</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Calls per month</p>
                  <p className="text-3xl font-bold">{formatNumber(callsPerMonth)}</p>
                </div>
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Connections per month</p>
                  <p className="text-3xl font-bold">{formatNumber(connectionsPerMonth)}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Conversions (Appraisal Opportunities) per month</p>
                  <p className="text-3xl font-bold">{conversionsPerMonth}</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Annual Metrics */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold">Annual Metrics</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Calls per year</p>
                  <p className="text-3xl font-bold">{formatNumber(callsPerYear)}</p>
                </div>
                <Phone className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Connections per year</p>
                  <p className="text-3xl font-bold">{formatNumber(connectionsPerYear)}</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Conversions (Appraisal Opportunities) per year</p>
                  <p className="text-3xl font-bold">{conversionsPerYear}</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Calculation Assumptions */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="text-xl font-bold">Calculation Assumptions</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• {CONNECTION_RATE * 100}% of calls will result in a connection</li>
            <li>• {CONVERSION_RATE * 100}% of connections will convert to an appraisal</li>
            <li>• {TOUCHES_PER_YEAR} touches per contact per year for nurturing</li>
            <li>• {WORKING_WEEKS} working weeks per year</li>
            <li>• {NATURAL_TURNOVER_RATE * 100}% of your database will naturally turn over annually, with or without your involvement</li>
            <li>• {formatCurrency(AVG_GCI_PER_LISTING)} average GCI per listing/sale</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default NurtureCalculator;
