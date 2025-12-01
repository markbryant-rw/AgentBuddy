import { useState } from 'react';
import { DescriptionForm } from './components/DescriptionForm';
import { DescriptionOutput } from './components/DescriptionOutput';
import { DescriptionHistory } from './components/DescriptionHistory';
import { useListingDescriptions, type GenerateParams, type GeneratedDescriptions, type ListingDescription } from '@/hooks/useListingDescriptions';
import { FileText, Sparkles } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';

const ListingDescriptionGenerator = () => {
  const {
    descriptions,
    loading,
    generateDescription,
    isGenerating,
    saveDescription,
    isSaving,
    deleteDescription,
    isDeleting,
  } = useListingDescriptions();

  const [currentParams, setCurrentParams] = useState<GenerateParams | null>(null);
  const [generatedDescriptions, setGeneratedDescriptions] = useState<GeneratedDescriptions | null>(null);

  const handleGenerate = async (params: GenerateParams) => {
    setCurrentParams(params);
    const result = await generateDescription(params);
    setGeneratedDescriptions(result);
  };

  const handleSave = async (descriptions: GeneratedDescriptions) => {
    if (!currentParams) return;
    await saveDescription({
      address: currentParams.address,
      bedrooms: currentParams.bedrooms,
      bathrooms: currentParams.bathrooms,
      listingType: currentParams.listingType,
      targetAudience: currentParams.targetAudience,
      additionalFeatures: currentParams.additionalFeatures,
      descriptions,
    });
  };

  const handleRegenerate = () => {
    if (currentParams) {
      handleGenerate(currentParams);
    }
  };

  const handleLoad = (description: ListingDescription) => {
    setCurrentParams({
      address: description.address,
      bedrooms: description.bedrooms,
      bathrooms: description.bathrooms,
      listingType: description.listing_type,
      targetAudience: description.target_audience,
      additionalFeatures: description.additional_features || undefined,
    });
    setGeneratedDescriptions(description.generated_descriptions);
  };

  const handleDelete = async (id: string) => {
    await deleteDescription(id);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="bg-gradient-to-br from-green-50/30 to-white dark:from-green-900/5 dark:to-background p-6 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-green-100 dark:bg-green-900/30">
            <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Listing Description Generator</h1>
            <p className="text-muted-foreground">
              Generate compelling property descriptions tailored to your target audience
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <DescriptionForm
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            defaultValues={currentParams || undefined}
          />
        </div>

        <div className="lg:col-span-2 space-y-6">
          {generatedDescriptions ? (
            <>
              <div className="bg-gradient-to-br from-white to-green-50/30 dark:from-background dark:to-green-900/5 p-6 rounded-xl">
                <DescriptionOutput
                  descriptions={generatedDescriptions}
                  onSave={handleSave}
                  onRegenerate={handleRegenerate}
                  isSaving={isSaving}
                  isGenerating={isGenerating}
                />
              </div>
            </>
          ) : (
            <EmptyState
              icon={Sparkles}
              title="No description generated yet"
              description="Fill in the property details to generate compelling descriptions"
              category="listings"
            />
          )}
          
          <DescriptionHistory
            descriptions={descriptions}
            onLoad={handleLoad}
            onDelete={handleDelete}
            isDeleting={isDeleting}
          />
        </div>
      </div>
    </div>
  );
};

export default ListingDescriptionGenerator;
