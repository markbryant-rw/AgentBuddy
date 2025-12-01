import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Copy, Check, Save, RefreshCw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { GeneratedDescriptions } from '@/hooks/useListingDescriptions';

interface DescriptionOutputProps {
  descriptions: GeneratedDescriptions;
  onSave: (descriptions: GeneratedDescriptions) => void;
  onRegenerate: () => void;
  isSaving: boolean;
  isGenerating: boolean;
}

export const DescriptionOutput = ({
  descriptions,
  onSave,
  onRegenerate,
  isSaving,
  isGenerating,
}: DescriptionOutputProps) => {
  const [editedDescriptions, setEditedDescriptions] = useState(descriptions);
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});

  const handleCopy = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedStates({ ...copiedStates, [type]: true });
      toast({
        title: 'Copied!',
        description: `${type} description copied to clipboard`,
      });
      setTimeout(() => {
        setCopiedStates({ ...copiedStates, [type]: false });
      }, 2000);
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const handleDescriptionChange = (type: keyof GeneratedDescriptions, value: string) => {
    setEditedDescriptions({ ...editedDescriptions, [type]: value });
  };

  const handleSave = () => {
    onSave(editedDescriptions);
  };

  const getCharCount = (text: string) => text.length;
  const getWordCount = (text: string) => text.trim().split(/\s+/).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Generated Descriptions</CardTitle>
            <CardDescription>
              Three variations optimized for different marketing channels
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRegenerate}
              disabled={isGenerating}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              Regenerate
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save All'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="short" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="short" className="gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              Short
            </TabsTrigger>
            <TabsTrigger value="medium" className="gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Medium
            </TabsTrigger>
            <TabsTrigger value="long" className="gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              Long
            </TabsTrigger>
          </TabsList>

          <TabsContent value="short" className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Social Media Ready (50-80 words)</p>
                <p className="text-sm text-muted-foreground">
                  {getWordCount(editedDescriptions.short)} words · {getCharCount(editedDescriptions.short)} characters
                </p>
              </div>
              <Textarea
                value={editedDescriptions.short}
                onChange={(e) => handleDescriptionChange('short', e.target.value)}
                className="min-h-[120px] font-sans"
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => handleCopy(editedDescriptions.short, 'Short')}
              >
                {copiedStates.short ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="medium" className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Website Listing (120-150 words)</p>
                <p className="text-sm text-muted-foreground">
                  {getWordCount(editedDescriptions.medium)} words · {getCharCount(editedDescriptions.medium)} characters
                </p>
              </div>
              <Textarea
                value={editedDescriptions.medium}
                onChange={(e) => handleDescriptionChange('medium', e.target.value)}
                className="min-h-[180px] font-sans"
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => handleCopy(editedDescriptions.medium, 'Medium')}
              >
                {copiedStates.medium ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="long" className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Detailed Brochure (200-250 words)</p>
                <p className="text-sm text-muted-foreground">
                  {getWordCount(editedDescriptions.long)} words · {getCharCount(editedDescriptions.long)} characters
                </p>
              </div>
              <Textarea
                value={editedDescriptions.long}
                onChange={(e) => handleDescriptionChange('long', e.target.value)}
                className="min-h-[280px] font-sans"
              />
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => handleCopy(editedDescriptions.long, 'Long')}
              >
                {copiedStates.long ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
