import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Building2, Users, Briefcase } from 'lucide-react';

interface Agency {
  id: string;
  name: string;
  slug: string;
  brand?: string | null;
  teamCount: number;
  userCount: number;
  hasActiveSubscription: boolean;
}

interface BrandAccordionProps {
  agencies: Agency[];
}

const extractBrand = (agencyName: string): string => {
  const commonBrands = [
    'Ray White',
    'Harcourts',
    'LJ Hooker',
    'First National',
    'Professionals',
    'Century 21',
    'RE/MAX',
    'Raine & Horne',
    'Elders Real Estate',
    'Barry Plant',
  ];

  for (const brand of commonBrands) {
    if (agencyName.toLowerCase().includes(brand.toLowerCase())) {
      return brand;
    }
  }

  return 'Independent';
};

export const BrandAccordion = ({ agencies }: BrandAccordionProps) => {
  const brandGroups = useMemo(() => {
    const groups: Record<string, Agency[]> = {};

    agencies.forEach((agency) => {
      const brand = agency.brand || extractBrand(agency.name);
      if (!groups[brand]) {
        groups[brand] = [];
      }
      groups[brand].push(agency);
    });

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [agencies]);

  return (
    <Accordion type="multiple" className="space-y-4">
      {brandGroups.map(([brand, brandAgencies]) => {
        const totalTeams = brandAgencies.reduce((sum, a) => sum + a.teamCount, 0);
        const totalUsers = brandAgencies.reduce((sum, a) => sum + a.userCount, 0);

        return (
          <AccordionItem key={brand} value={brand} className="border rounded-lg">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-3 flex-1">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div className="text-left flex-1">
                  <div className="font-semibold">{brand}</div>
                  <div className="text-sm text-muted-foreground">
                    {brandAgencies.length} agencies • {totalTeams} teams • {totalUsers} users
                  </div>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-2 mt-2">
                {brandAgencies.map((agency) => (
                  <Card key={agency.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="font-medium mb-1">{agency.name}</div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Briefcase className="h-3 w-3" />
                              {agency.teamCount} teams
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {agency.userCount} users
                            </span>
                          </div>
                        </div>
                        <Badge variant={agency.hasActiveSubscription ? 'default' : 'secondary'}>
                          {agency.hasActiveSubscription ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
};
