import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface OfficePageHeaderProps {
  title: string;
  description?: string;
}

export function OfficePageHeader({ title, description }: OfficePageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="mb-6">
      <div className="flex items-center gap-4 mb-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/office-manager')}
          className="gap-2 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>
      </div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}
