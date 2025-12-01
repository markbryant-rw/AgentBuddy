import { ServiceProvider } from '@/hooks/directory/useServiceProviders';
import { ProviderCard } from './ProviderCard';

interface DirectoryGridProps {
  providers: ServiceProvider[];
  onSelectProvider: (provider: ServiceProvider) => void;
}

export const DirectoryGrid = ({ providers, onSelectProvider }: DirectoryGridProps) => {
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {providers.map((provider) => (
        <ProviderCard
          key={provider.id}
          provider={provider}
          onClick={() => onSelectProvider(provider)}
        />
      ))}
    </div>
  );
};
