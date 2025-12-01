import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useServiceProviders } from '@/hooks/directory/useServiceProviders';
import { useProviderCategories } from '@/hooks/directory/useProviderCategories';
import { DirectoryHeader } from '@/components/directory/DirectoryHeader';
import { DirectoryGrid } from '@/components/directory/DirectoryGrid';
import { DirectoryList } from '@/components/directory/DirectoryList';
import { AddProviderDialog } from '@/components/directory/AddProviderDialog';
import { ProviderDetailDrawer } from '@/components/directory/ProviderDetailDrawer';
import { ServiceProvider } from '@/hooks/directory/useServiceProviders';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const Directory = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedProvider, setSelectedProvider] = useState<ServiceProvider | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: categories = [] } = useProviderCategories();
  const { data: providers = [], isLoading } = useServiceProviders({
    searchQuery,
    categoryId: selectedCategory || undefined,
  });

  // Update selectedProvider when providers data changes (e.g., after update)
  useEffect(() => {
    if (selectedProvider && providers.length > 0) {
      const updatedProvider = providers.find(p => p.id === selectedProvider.id);
      if (updatedProvider) {
        setSelectedProvider(updatedProvider);
      }
    }
  }, [providers]);

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/engage-dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold mb-1">Service Directory</h1>
            <p className="text-muted-foreground">
              Manage your team's trusted tradespeople and professional contacts
            </p>
          </div>
        </div>
      </div>

      <DirectoryHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddProvider={() => setShowAddDialog(true)}
      />

      <div className="mt-6">
        {isLoading ? (
          <div className="text-center py-12">Loading...</div>
        ) : viewMode === 'grid' ? (
          <DirectoryGrid providers={providers} onSelectProvider={setSelectedProvider} />
        ) : (
          <DirectoryList providers={providers} onSelectProvider={setSelectedProvider} />
        )}
      </div>

      <AddProviderDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
      
      <ProviderDetailDrawer
        provider={selectedProvider}
        open={!!selectedProvider}
        onOpenChange={(open) => !open && setSelectedProvider(null)}
      />
    </div>
  );
};

export default Directory;
