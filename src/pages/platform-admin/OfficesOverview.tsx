import { usePlatformOffices } from '@/hooks/usePlatformOffices';
import { OfficeCard } from '@/components/platform-admin/OfficeCard';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search, Building2 } from 'lucide-react';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export default function OfficesOverview() {
  const navigate = useNavigate();
  const { data: offices, isLoading, error } = usePlatformOffices();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOffices = offices?.filter(office =>
    office.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    office.active_users > 0
  ) || [];

  if (error) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <p className="text-destructive">Error loading offices: {error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Office Management</h1>
          <p className="text-muted-foreground">
            Manage all offices, teams, and users across the platform
          </p>
        </div>

        {/* Search & Actions */}
        <div className="flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search offices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Button
            onClick={() => navigate('/platform-admin/offices/create')}
            className="gap-2"
          >
            <Building2 className="h-4 w-4" />
            Add Office
          </Button>
        </div>

        {/* Office Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : filteredOffices.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No offices found matching your search' : 'No offices found'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffices.map((office) => (
              <OfficeCard
                key={office.id}
                office={office}
                onClick={() => navigate(`/platform-admin/users/office/${office.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
