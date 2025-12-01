import { Card } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';

interface WorkspaceCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  stats: { label: string; value: string | number; variant?: 'default' | 'secondary' | 'destructive' }[];
  path: string;
  color: string;
}

export const WorkspaceCard = ({ title, description, icon: Icon, stats, path, color }: WorkspaceCardProps) => {
  const navigate = useNavigate();

  return (
    <Card 
      className="p-6 hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => navigate(path)}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${color} group-hover:scale-110 transition-transform`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mt-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="text-center">
            <Badge variant={stat.variant || 'secondary'} className="mb-1">
              {stat.value}
            </Badge>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};
