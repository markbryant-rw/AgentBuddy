import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ThumbsUp, Phone, Mail, ExternalLink, Copy } from 'lucide-react';
import { ServiceProvider } from '@/hooks/directory/useServiceProviders';
import * as LucideIcons from 'lucide-react';
import { QuickActionsMenu } from './QuickActionsMenu';
import { useToast } from '@/hooks/use-toast';

interface ProviderCardProps {
  provider: ServiceProvider;
  onClick: () => void;
}

const ProviderCardComponent = ({ provider, onClick }: ProviderCardProps) => {
  const { toast } = useToast();
  const category = provider.provider_categories || provider.team_provider_categories;
  const CategoryIcon = category?.icon ? (LucideIcons[category.icon as keyof typeof LucideIcons] as React.FC<any>) : null;

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: `${label} copied successfully`,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  return (
    <TooltipProvider>
      <Card 
        className="p-4 hover:shadow-md transition-shadow cursor-pointer group"
        onClick={onClick}
      >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <Avatar className="h-12 w-12 shrink-0">
            {(provider.avatar_url || provider.logo_url) && (
              <AvatarImage 
                src={provider.avatar_url || provider.logo_url} 
                alt={provider.full_name}
              />
            )}
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {provider.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-base truncate">{provider.full_name}</h3>
              {CategoryIcon && (
                <div 
                  className="p-1 rounded shrink-0"
                  style={{ backgroundColor: `${category?.color}20` }}
                >
                  <CategoryIcon className="h-3 w-3" style={{ color: category?.color }} />
                </div>
              )}
            </div>
            {provider.company_name && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-sm text-muted-foreground line-clamp-2">{provider.company_name}</p>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{provider.company_name}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <QuickActionsMenu provider={provider} />
        </div>
      </div>

      {category && (
        <Badge 
          variant="outline" 
          className="mb-3"
          style={{ borderColor: category.color, color: category.color }}
        >
          {category.name}
        </Badge>
      )}

      <div className="space-y-2 text-sm">
        {provider.phone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4 shrink-0" />
            <span className="truncate flex-1">{provider.phone}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(provider.phone!, 'Phone number');
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        )}
        {provider.email && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-4 w-4 shrink-0" />
            <span className="truncate flex-1">{provider.email}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(provider.email!, 'Email');
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        )}
        {provider.website && (
          <a
            href={provider.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="h-4 w-4 shrink-0" />
            <span className="truncate">{provider.website}</span>
          </a>
        )}
      </div>

      {provider.total_reviews > 0 && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <ThumbsUp className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-600">
            {Math.round((provider.positive_count / provider.total_reviews) * 100)}%
          </span>
          <span className="text-xs text-muted-foreground">
            ({provider.total_reviews} {provider.total_reviews === 1 ? 'review' : 'reviews'})
          </span>
        </div>
      )}
    </Card>
    </TooltipProvider>
  );
};

export const ProviderCard = memo(ProviderCardComponent);
