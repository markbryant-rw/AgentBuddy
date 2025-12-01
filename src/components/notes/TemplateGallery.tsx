import { useState } from 'react';
import { useNoteTemplates, NoteTemplate } from '@/hooks/useNoteTemplates';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Settings, Eye, TrendingUp } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplatePreviewDialog } from './TemplatePreviewDialog';
import { useNavigate } from 'react-router-dom';

interface TemplateGalleryProps {
  onSelect: (template: NoteTemplate) => void;
}

export const TemplateGallery = ({ onSelect }: TemplateGalleryProps) => {
  const { templates, isLoading, incrementUsage } = useNoteTemplates();
  const navigate = useNavigate();
  const [previewTemplate, setPreviewTemplate] = useState<NoteTemplate | null>(null);

  const categories = Array.from(new Set(templates.map((t) => t.category)));

  const categoryIcons: Record<string, string> = {
    events: '🎤',
    meetings: '📅',
    listings: '🏠',
    vendors: '🤝',
    personal: '📝',
    general: '📄',
  };

  const handleSelectTemplate = async (template: NoteTemplate) => {
    await incrementUsage.mutateAsync(template.id);
    onSelect(template);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading templates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Template Gallery</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/templates')}
        >
          <Settings className="h-4 w-4 mr-2" />
          Manage Templates
        </Button>
      </div>

      <Tabs defaultValue={categories[0] || 'all'} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All</TabsTrigger>
        {categories.map((cat) => (
          <TabsTrigger key={cat} value={cat}>
            {categoryIcons[cat] || '📄'} {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="all" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{categoryIcons[template.category] || '📄'}</span>
                <div>
                  <h3 className="font-semibold">{template.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Badge variant="secondary">{template.category}</Badge>
              {template.is_system && <Badge variant="outline">System</Badge>}
              {template.usage_count && template.usage_count > 0 && (
                <Badge variant="outline" className="gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {template.usage_count}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setPreviewTemplate(template)}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
              <Button 
                size="sm" 
                onClick={() => handleSelectTemplate(template)}
                className="flex-1"
              >
                Use Template
              </Button>
            </div>
          </Card>
        ))}
      </TabsContent>

      {categories.map((cat) => (
        <TabsContent key={cat} value={cat} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates
            .filter((t) => t.category === cat)
            .map((template) => (
              <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{categoryIcons[template.category] || '📄'}</span>
                    <div>
                      <h3 className="font-semibold">{template.title}</h3>
                      <p className="text-sm text-muted-foreground">{template.description}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => setPreviewTemplate(template)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1" 
                    onClick={() => handleSelectTemplate(template)}
                  >
                    Use Template
                  </Button>
                </div>
              </Card>
            ))}
        </TabsContent>
      ))}
    </Tabs>

    <TemplatePreviewDialog
      open={!!previewTemplate}
      onOpenChange={(open) => !open && setPreviewTemplate(null)}
      template={previewTemplate}
      onUse={handleSelectTemplate}
    />
    </div>
  );
};
