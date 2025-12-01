import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LucideIcon, ArrowRight, Lock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ModuleId } from '@/hooks/useModuleAccess';
import { useNewModuleAccess } from '@/hooks/useNewModuleAccess';
import { FREE_MODULES } from '@/lib/constants';
interface ModuleCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  route: string;
  moduleId: ModuleId;
  available?: boolean;
  categoryColor?: string;
}
export const ModuleCard = ({
  icon: Icon,
  title,
  description,
  route,
  moduleId,
  available = true,
  categoryColor = 'bg-primary/10'
}: ModuleCardProps) => {
  const { hasAccess, getAccessInfo, isLoading } = useNewModuleAccess();
  const navigate = useNavigate();

  const accessInfo = getAccessInfo(moduleId);
  const moduleHasAccess = hasAccess(moduleId);
  const accessSource = accessInfo?.policy_source;

  // Check if module is free for everyone using centralized constant
  const isFreeModule = FREE_MODULES.includes(moduleId);
  const hasModuleAccess = isFreeModule ? true : moduleHasAccess;
  const handleClick = () => {
    if (!available) {
      return;
    }
    if (!hasModuleAccess) {
      navigate('/pricing');
    } else {
      navigate(route);
    }
  };
  return <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className={`rounded-lg ${categoryColor} p-3 w-fit`}>
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex flex-col gap-1 items-end">
            {!available && <Badge variant="secondary" className="text-xs">
                Coming Soon
              </Badge>}
            {available && !hasModuleAccess && <Badge variant="outline" className="gap-1 text-xs">
                <Lock className="h-3 w-3" /> Premium
              </Badge>}
            {hasModuleAccess && accessSource === 'agency' && <Badge variant="default" className="gap-1 text-xs">
                <CheckCircle className="h-3 w-3" /> Agency
              </Badge>}
            {hasModuleAccess && accessSource === 'individual' && <Badge variant="secondary" className="gap-1 text-xs">
                <CheckCircle className="h-3 w-3" /> Subscribed
              </Badge>}
            {hasModuleAccess && isFreeModule}
          </div>
        </div>
        <CardTitle className="mt-4">{title}</CardTitle>
        <CardDescription className="min-h-[2.5rem] line-clamp-2">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button className="w-full" variant={hasModuleAccess || !available ? "default" : "outline"} onClick={handleClick} disabled={!available || isLoading}>
          {isLoading ? 'Checking access...' : !available ? 'Coming Soon' : !hasModuleAccess ? 'Unlock Module' : 'Open Module'}
          {available && !isLoading && <ArrowRight className="ml-2 h-4 w-4" />}
        </Button>
      </CardContent>
    </Card>;
};