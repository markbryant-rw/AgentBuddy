import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ServiceProvider } from '@/hooks/directory/useServiceProviders';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Mail, ExternalLink, ThumbsUp, Calendar, Copy, Pencil, User } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { ProviderReviewsSection } from './ProviderReviewsSection';
import { EditProviderDialog } from './EditProviderDialog';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface ProviderDetailDrawerProps {
  provider: ServiceProvider | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProviderDetailDrawer = ({ provider, open, onOpenChange }: ProviderDetailDrawerProps) => {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { user, hasRole, isPlatformAdmin } = useAuth();

  if (!provider) return null;

  // Check if user can edit (creator, office manager, or platform admin)
  const canEdit = user && (
    provider.created_by === user.id ||
    hasRole('office_manager') ||
    isPlatformAdmin
  );

  const category = provider.provider_categories || provider.team_provider_categories;
  const CategoryIcon = category?.icon ? (LucideIcons[category.icon as keyof typeof LucideIcons] as React.FC<any>) : null;
  const displayImage = provider.avatar_url || provider.logo_url;
  const displayImageWithCache = displayImage ? `${displayImage}?t=${Date.now()}` : displayImage;
  const initials = provider.full_name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-start gap-4 flex-1">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarImage src={displayImage || undefined} alt={provider.full_name} />
                  <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <SheetTitle className="text-2xl mb-1">{provider.full_name}</SheetTitle>
                  {provider.company_name && (
                    <SheetDescription className="text-base">
                      {provider.company_name}
                    </SheetDescription>
                  )}
                  {category && (
                    <Badge 
                      variant="outline" 
                      className="w-fit mt-2"
                      style={{ borderColor: category.color, color: category.color }}
                    >
                      {category.name}
                    </Badge>
                  )}
                </div>
              </div>
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsEditOpen(true)}
                  className="shrink-0"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="overview" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="reviews">Reviews</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Contact Info */}
              <div className="space-y-3 outline-none focus:outline-none">
                <h3 className="font-semibold">Contact Information</h3>
                
                {provider.phone && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{provider.phone}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `tel:${provider.phone}`}
                      >
                        Call
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(provider.phone!, 'Phone number')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {provider.email && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{provider.email}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `mailto:${provider.email}`}
                      >
                        Email
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleCopy(provider.email!, 'Email')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {provider.website && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{provider.website}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(provider.website!, '_blank')}
                    >
                      Visit
                    </Button>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                {provider.total_reviews > 0 && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <ThumbsUp className="h-4 w-4 text-green-600" />
                      <span className="text-2xl font-bold text-green-600">
                        {Math.round((provider.positive_count / provider.total_reviews) * 100)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {provider.total_reviews} {provider.total_reviews === 1 ? 'review' : 'reviews'}
                    </p>
                  </div>
                )}

                {provider.last_used_at && (
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Last Used</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(provider.last_used_at), { addSuffix: true })}
                    </p>
                  </div>
                )}
              </div>

              {/* Created By Section */}
              {provider.creator && (
                <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                  <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Created By
                  </h3>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={provider.creator.avatar_url || undefined} />
                      <AvatarFallback>
                        {provider.creator.full_name
                          .split(' ')
                          .map(n => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{provider.creator.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(provider.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes Preview */}
              {provider.notes && (
                <div className="space-y-2">
                  <h3 className="font-semibold">Notes</h3>
                  <div className="p-3 border rounded-lg bg-muted/50">
                    <p className="text-sm whitespace-pre-wrap">{provider.notes}</p>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="mt-6">
              <ProviderReviewsSection providerId={provider.id} />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <EditProviderDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        provider={provider}
      />
    </>
  );
};
