import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Calendar, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const QuarterlyBanner = () => {
  const navigate = useNavigate();

  return (
    <Alert className="mb-4 border-primary bg-primary/10">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        <Calendar className="h-4 w-4" />
        Quarterly Review Needed
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>It's time to complete your quarterly review and set goals for the upcoming quarter.</span>
        <Button 
          onClick={() => navigate('/review-roadmap')} 
          size="sm" 
          className="ml-4"
        >
          Start Review
        </Button>
      </AlertDescription>
    </Alert>
  );
};
