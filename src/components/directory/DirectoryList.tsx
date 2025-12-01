import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ServiceProvider } from '@/hooks/directory/useServiceProviders';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ThumbsUp } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { QuickActionsMenu } from './QuickActionsMenu';

interface DirectoryListProps {
  providers: ServiceProvider[];
  onSelectProvider: (provider: ServiceProvider) => void;
}

export const DirectoryList = ({ providers, onSelectProvider }: DirectoryListProps) => {
  if (providers.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No providers found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Reviews</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {providers.map((provider) => {
            const category = provider.provider_categories || provider.team_provider_categories;
            const CategoryIcon = category?.icon ? (LucideIcons[category.icon as keyof typeof LucideIcons] as React.FC<any>) : null;

            return (
              <TableRow 
                key={provider.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onSelectProvider(provider)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      {(provider.avatar_url || provider.logo_url) && (
                        <AvatarImage 
                          src={provider.avatar_url || provider.logo_url} 
                          alt={provider.full_name}
                        />
                      )}
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {provider.full_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{provider.full_name}</p>
                      {provider.company_name && (
                        <p className="text-sm text-muted-foreground">{provider.company_name}</p>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {category && (
                    <Badge 
                      variant="outline"
                      className="flex items-center gap-1 w-fit"
                      style={{ borderColor: category.color, color: category.color }}
                    >
                      {CategoryIcon && <CategoryIcon className="h-3 w-3" />}
                      {category.name}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="text-sm space-y-1">
                    {provider.phone && <p>{provider.phone}</p>}
                    {provider.email && <p className="text-muted-foreground">{provider.email}</p>}
                  </div>
                </TableCell>
                <TableCell>
                  {provider.total_reviews > 0 ? (
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-600">
                        {Math.round((provider.positive_count / provider.total_reviews) * 100)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({provider.total_reviews})
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No reviews</span>
                  )}
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <QuickActionsMenu provider={provider} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
