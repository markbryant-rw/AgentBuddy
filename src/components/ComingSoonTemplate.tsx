import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Lightbulb, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MODULE_COLORS, ModuleCategoryColor } from '@/lib/moduleColors';

interface ComingSoonTemplateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  category: ModuleCategoryColor;
}

export const ComingSoonTemplate = ({ 
  icon: Icon, 
  title, 
  description, 
  category 
}: ComingSoonTemplateProps) => {
  const navigate = useNavigate();
  const colors = MODULE_COLORS[category];

  return (
    <div className={cn(
      "min-h-[calc(100vh-4rem)] flex items-center justify-center",
      "bg-gradient-to-br to-white dark:to-background",
      category === 'performance' && "from-blue-50/20 dark:from-blue-900/5",
      category === 'listings' && "from-green-50/20 dark:from-green-900/5",
      category === 'communication' && "from-yellow-50/20 dark:from-yellow-900/5",
      category === 'systems' && "from-indigo-50/20 dark:from-indigo-900/5"
    )}>
      <div className="text-center space-y-6 p-8 max-w-2xl">
        <div className="relative inline-block">
          <div className={cn("p-6 rounded-2xl", colors.iconBg)}>
            <Icon className={cn("h-24 w-24", colors.text)} />
          </div>
          <div className={cn(
            "absolute -inset-2 rounded-2xl animate-pulse-slow -z-10",
            category === 'performance' && "bg-blue-500/20",
            category === 'listings' && "bg-green-500/20",
            category === 'communication' && "bg-yellow-500/20",
            category === 'systems' && "bg-indigo-500/20"
          )} />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">{title}</h1>
          <p className="text-xl text-muted-foreground">{description}</p>
        </div>
        
        <p className="text-muted-foreground">
          We're building something amazing. Stay tuned!
        </p>
        
        <div className="flex gap-3 justify-center flex-wrap">
          <Button size="lg" onClick={() => navigate('/feature-request')}>
            <Lightbulb className="h-5 w-5 mr-2" />
            Request Features
          </Button>
          <Button size="lg" variant="outline" onClick={() => navigate('/')}>
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
};
