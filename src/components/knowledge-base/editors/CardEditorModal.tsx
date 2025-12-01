import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CardEditor } from "./CardEditor";
import { CardTemplates, TEMPLATES, Template } from "./CardTemplates";
import { Separator } from "@/components/ui/separator";

interface Card {
  id?: string;
  card_number: number;
  title: string;
  content?: any;
  template?: string;
  estimated_minutes?: number;
}

interface CardEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: Card | null;
  onSave: (card: Partial<Card>) => void;
}

export function CardEditorModal({ open, onOpenChange, card, onSave }: CardEditorModalProps) {
  const [showTemplates, setShowTemplates] = useState(!card?.id);
  const [formData, setFormData] = useState<Partial<Card>>({
    title: '',
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    template: 'blank',
    estimated_minutes: 0,
    ...card
  });

  useEffect(() => {
    if (card) {
      setFormData(card);
      setShowTemplates(false);
    } else {
      setShowTemplates(true);
    }
  }, [card]);

  const handleTemplateSelect = (template: Template) => {
    setFormData({
      ...formData,
      content: template.content,
      template: template.id,
    });
    setShowTemplates(false);
  };

  const handleSave = () => {
    if (!formData.title) {
      return;
    }
    onSave(formData);
    onOpenChange(false);
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{card?.id ? 'Edit Chapter' : 'New Chapter'}</DialogTitle>
          <DialogDescription>
            Create rich content with text, images, and video embeds
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {showTemplates && !card?.id && (
            <>
              <div>
                <Label className="text-base">Start from template</Label>
                <p className="text-sm text-muted-foreground mb-3">Choose a template to get started quickly</p>
                <CardTemplates onSelect={handleTemplateSelect} />
              </div>
              <Separator />
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Chapter Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Understanding the Listing Agreement"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimated_minutes">Estimated Time (minutes)</Label>
            <Input
              id="estimated_minutes"
              type="number"
              value={formData.estimated_minutes || ''}
              onChange={(e) => setFormData({ ...formData, estimated_minutes: parseInt(e.target.value) || 0 })}
              placeholder="5"
            />
          </div>

          <div className="space-y-2">
            <Label>Content</Label>
            <CardEditor
              content={formData.content}
              onChange={(content) => setFormData({ ...formData, content })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.title}>
            {card?.id ? 'Save Changes' : 'Create Chapter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
