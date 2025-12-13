import { differenceInYears } from "date-fns";
import { Heart, Clock, CheckCircle, AlertTriangle, Calendar, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AftercareImportOptions as ImportOptions, HistoricalTaskMode, SaleAgeCategory } from "@/types/aftercare";

interface AftercareImportOptionsProps {
  options: ImportOptions;
  onChange: (options: ImportOptions) => void;
  validatedRows: Array<{ valid: boolean; data: { settlement_date?: string } }>;
}

export function AftercareImportOptions({ 
  options, 
  onChange, 
  validatedRows 
}: AftercareImportOptionsProps) {
  const now = new Date();
  
  // Categorize sales by age
  const categorizeByAge = (): { recent: number; historical: number; legacy: number } => {
    let recent = 0;
    let historical = 0;
    let legacy = 0;
    
    validatedRows.filter(r => r.valid).forEach(row => {
      const settlementDate = row.data.settlement_date;
      if (!settlementDate) {
        recent++; // Assume recent if no date
        return;
      }
      
      const yearsAgo = differenceInYears(now, new Date(settlementDate));
      
      if (yearsAgo < 1) {
        recent++;
      } else if (yearsAgo <= 10) {
        historical++;
      } else {
        legacy++;
      }
    });
    
    return { recent, historical, legacy };
  };
  
  const ageCounts = categorizeByAge();
  
  const ageCategories: SaleAgeCategory[] = [
    {
      label: "Recent",
      count: ageCounts.recent,
      color: "bg-emerald-500",
      description: "< 1 year old - Full 10-year plan"
    },
    {
      label: "Historical",
      count: ageCounts.historical,
      color: "bg-amber-500",
      description: "1-10 years old - Partial plan (past tasks handled)"
    },
    {
      label: "Legacy",
      count: ageCounts.legacy,
      color: "bg-purple-500",
      description: "10+ years old - Evergreen annual plan"
    }
  ];
  
  const hasHistoricalSales = ageCounts.historical > 0 || ageCounts.legacy > 0;

  return (
    <Card className="border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            <CardTitle className="text-base">Aftercare Plans</CardTitle>
          </div>
          <Switch
            checked={options.activateAftercare}
            onCheckedChange={(checked) => onChange({ ...options, activateAftercare: checked })}
          />
        </div>
      </CardHeader>
      
      {options.activateAftercare && (
        <CardContent className="space-y-4 pt-0">
          {/* Age Breakdown */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              Import Age Breakdown
            </div>
            <div className="flex gap-2 flex-wrap">
              {ageCategories.map((category) => (
                <TooltipProvider key={category.label}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge 
                        variant="secondary" 
                        className="gap-1.5 cursor-help"
                      >
                        <div className={`h-2 w-2 rounded-full ${category.color}`} />
                        {category.label}: {category.count}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{category.description}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>
          </div>
          
          {/* Historical Task Handling */}
          {hasHistoricalSales && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Clock className="h-4 w-4 text-muted-foreground" />
                How should we handle past-due tasks?
              </div>
              
              <RadioGroup
                value={options.historicalMode}
                onValueChange={(value) => onChange({ 
                  ...options, 
                  historicalMode: value as HistoricalTaskMode 
                })}
                className="space-y-2"
              >
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-background">
                  <RadioGroupItem value="skip" id="skip" className="mt-0.5" />
                  <Label htmlFor="skip" className="flex-1 cursor-pointer">
                    <div className="font-medium flex items-center gap-2">
                      Skip Historical Tasks
                      <Badge variant="outline" className="text-xs">Recommended</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Only create future tasks. Past tasks are marked as "Historical" and won't affect health score.
                    </p>
                  </Label>
                </div>
                
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-background">
                  <RadioGroupItem value="complete" id="complete" className="mt-0.5" />
                  <Label htmlFor="complete" className="flex-1 cursor-pointer">
                    <div className="font-medium flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      Mark as Completed
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Auto-complete past tasks assuming touchpoints were done. Shows full timeline as complete.
                    </p>
                  </Label>
                </div>
                
                <div className="flex items-start space-x-3 p-3 rounded-lg border bg-background">
                  <RadioGroupItem value="include" id="include" className="mt-0.5" />
                  <Label htmlFor="include" className="flex-1 cursor-pointer">
                    <div className="font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Include as Overdue
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Create all tasks including past-due. Health scores may start lower.
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}
          
          {/* Legacy Sales Info */}
          {ageCounts.legacy > 0 && (
            <Alert className="border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/30">
              <Info className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-900 dark:text-purple-100">
                <strong>{ageCounts.legacy} sales</strong> are over 10 years old. These will use the 
                "Evergreen Relationship" template with rolling annual check-ins for the next 5 years.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      )}
    </Card>
  );
}
