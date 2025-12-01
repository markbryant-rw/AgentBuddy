import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BrandAccordion } from './BrandAccordion';
import { Building2, Edit } from 'lucide-react';
import { EditOfficeDialog } from './EditOfficeDialog';

interface AgencyOverview {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  teamCount: number;
  userCount: number;
  hasActiveSubscription: boolean;
  brand?: string | null;
  brand_color?: string | null;
  bio?: string | null;
}

interface AgencyOverviewListProps {
  agencies: AgencyOverview[] | undefined;
  isLoading: boolean;
}

export const AgencyOverviewList = ({ agencies, isLoading }: AgencyOverviewListProps) => {
  const [viewMode, setViewMode] = useState<'list' | 'brand'>('brand');
  const [selectedOffice, setSelectedOffice] = useState<AgencyOverview | null>(null);
  const [showEditOffice, setShowEditOffice] = useState(false);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Agency Overview</CardTitle>
          <CardDescription>All agencies on the platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Agency Overview</CardTitle>
            <CardDescription>All agencies on the platform</CardDescription>
          </div>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'brand')}>
            <TabsList>
              <TabsTrigger value="list">List View</TabsTrigger>
              <TabsTrigger value="brand">Group by Brand</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {agencies && agencies.length > 0 ? (
          viewMode === 'brand' ? (
            <BrandAccordion agencies={agencies} />
          ) : (
            <div className="space-y-3">
              {agencies.map((agency) => (
                <div key={agency.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Building2 className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{agency.name}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span>{agency.teamCount} teams</span>
                          <span>•</span>
                          <span>{agency.userCount} users</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant={agency.hasActiveSubscription ? 'default' : 'secondary'}>
                        {agency.hasActiveSubscription ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => {
                          setSelectedOffice(agency);
                          setShowEditOffice(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">No agencies yet</p>
        )}
      </CardContent>

      <EditOfficeDialog
        open={showEditOffice}
        onOpenChange={setShowEditOffice}
        office={selectedOffice}
      />
    </Card>
  );
};
