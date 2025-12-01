import { Alert, AlertDescription } from '@/components/ui/alert';
import { getDay } from 'date-fns';

interface ActionableStatusProps {
  current: number;
  target: number;
  breakdown: { calls: number; appraisals: number; openHomes: number };
}

export const ActionableStatus = ({ current, target, breakdown }: ActionableStatusProps) => {
  const remaining = target - current;
  const dayOfWeek = getDay(new Date());
  const daysRemaining = dayOfWeek === 0 ? 1 : 7 - dayOfWeek;
  const dailyNeed = remaining / Math.max(daysRemaining, 1);
  
  const getSuggestions = () => {
    if (remaining <= 0) {
      return "🎉 Target hit! Keep up the momentum.";
    }
    
    const suggestions = [];
    
    // Option 1: All calls
    const callsNeeded = Math.ceil(remaining * 20);
    suggestions.push(`${callsNeeded} calls`);
    
    // Option 2: Appraisals
    if (remaining >= 1) {
      const appraisalsNeeded = Math.ceil(remaining);
      suggestions.push(`${appraisalsNeeded} appraisal${appraisalsNeeded > 1 ? 's' : ''}`);
    }
    
    // Option 3: Open homes
    const openHomesNeeded = Math.ceil(remaining * 2);
    suggestions.push(`${openHomesNeeded} open home${openHomesNeeded > 1 ? 's' : ''}`);
    
    return `🎯 Need ${remaining.toFixed(1)} more hrs (${dailyNeed.toFixed(1)}/day). Try: ${suggestions.join(' OR ')}`;
  };
  
  const percentage = (current / target) * 100;
  const variant = percentage < 60 ? "border-destructive" : percentage < 85 ? "border-yellow-500" : "border-green-500";
  
  return (
    <Alert className={variant}>
      <AlertDescription className="text-sm">{getSuggestions()}</AlertDescription>
    </Alert>
  );
};
