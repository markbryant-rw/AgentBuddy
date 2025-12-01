import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';
import { AdminUser } from '@/hooks/useAdminUsers';
import { CompactUserCard } from './CompactUserCard';

interface OfficeManagersSectionProps {
  managers: AdminUser[];
  onViewDetails: (userId: string) => void;
}

export const OfficeManagersSection = ({ managers, onViewDetails }: OfficeManagersSectionProps) => {
  if (managers.length === 0) return null;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Office Managers
          <Badge variant="secondary" className="ml-2">
            {managers.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {managers.map((manager) => (
            <CompactUserCard
              key={manager.id}
              user={manager}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
