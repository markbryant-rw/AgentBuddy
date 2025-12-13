import { useEffect, useState } from "react";
import { PartyPopper, Home, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import confetti from "canvas-confetti";
import { format, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";

interface Settlement {
  id: string;
  address: string;
  suburb: string | null;
  sale_price: number | null;
  settlement_date: string;
  agent_name: string | null;
  agent_avatar: string | null;
}

interface SettlementCelebrationsProps {
  settlements: Settlement[];
  showConfetti?: boolean;
}

export function SettlementCelebrations({ settlements, showConfetti = true }: SettlementCelebrationsProps) {
  const [hasAnimated, setHasAnimated] = useState(false);

  // Filter for this week's settlements
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const thisWeeksSettlements = settlements.filter(s => {
    const settleDate = new Date(s.settlement_date);
    return isWithinInterval(settleDate, { start: weekStart, end: weekEnd });
  });

  useEffect(() => {
    if (thisWeeksSettlements.length > 0 && showConfetti && !hasAnimated) {
      setHasAnimated(true);
      
      // Trigger celebration confetti
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ['#10b981', '#f59e0b', '#6366f1', '#ec4899'],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ['#10b981', '#f59e0b', '#6366f1', '#ec4899'],
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [thisWeeksSettlements.length, showConfetti, hasAnimated]);

  if (thisWeeksSettlements.length === 0) {
    return null;
  }

  const formatPrice = (price: number | null) => {
    if (!price) return '';
    return new Intl.NumberFormat('en-NZ', {
      style: 'currency',
      currency: 'NZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <Card className="border-none bg-gradient-to-br from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-amber-500 flex items-center justify-center animate-bounce">
            <PartyPopper className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg bg-gradient-to-r from-emerald-600 to-amber-600 bg-clip-text text-transparent">
              🎉 Settlement Celebrations!
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {thisWeeksSettlements.length} settlement{thisWeeksSettlements.length > 1 ? 's' : ''} this week
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {thisWeeksSettlements.map((settlement, index) => (
          <div
            key={settlement.id}
            className={cn(
              "flex items-center gap-4 p-3 rounded-xl bg-white/70 dark:bg-black/20",
              "border border-emerald-200/50 dark:border-emerald-800/30",
              "transform transition-all hover:scale-[1.02]"
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <Avatar className="h-10 w-10 ring-2 ring-emerald-500/30">
              {settlement.agent_avatar ? (
                <AvatarImage src={settlement.agent_avatar} />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-amber-500 text-white text-xs">
                {settlement.agent_name?.split(' ').map(n => n[0]).join('') || '🏠'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Home className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="font-medium text-sm truncate">
                  {settlement.address}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                {settlement.agent_name && (
                  <span className="text-xs text-muted-foreground">
                    {settlement.agent_name}
                  </span>
                )}
                {settlement.suburb && (
                  <Badge variant="outline" className="text-xs py-0">
                    {settlement.suburb}
                  </Badge>
                )}
              </div>
            </div>

            {settlement.sale_price && (
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <DollarSign className="h-3 w-3" />
                  {formatPrice(settlement.sale_price).replace('$', '')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(settlement.settlement_date), 'EEE, MMM d')}
                </p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
