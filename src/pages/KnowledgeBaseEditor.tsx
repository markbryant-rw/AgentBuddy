import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Save } from "lucide-react";
import { usePlaybookEditor } from "@/hooks/usePlaybookEditor";
import { useCardEditor } from "@/hooks/useCardEditor";
import { usePlaybookCards } from "@/hooks/usePlaybookCards";
import { PlaybookMetadataForm } from "@/components/knowledge-base/editors/PlaybookMetadataForm";
import { CardList } from "@/components/knowledge-base/editors/CardList";

import { CardEditorModal } from "@/components/knowledge-base/editors/CardEditorModal";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function KnowledgeBaseEditor() {
  const navigate = useNavigate();
  const { playbookId } = useParams();
  const [searchParams] = useSearchParams();
  const isEditing = !!playbookId;
  const presetLibraryId = searchParams.get('library') || undefined;

  const { playbook, isLoading, createPlaybook, updatePlaybook, isCreating, isUpdating } = usePlaybookEditor(playbookId);
  const { cards, isLoading: cardsLoading } = usePlaybookCards(playbookId);
  const cardEditor = useCardEditor(playbookId || '');

  const [playbookData, setPlaybookData] = useState<any>(null);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [showCardEditor, setShowCardEditor] = useState(false);

  useEffect(() => {
    if (playbook) {
      setPlaybookData(playbook);
    } else if (!isEditing && presetLibraryId) {
      // Initialize with preset library for new playbooks
      setPlaybookData((prev: any) => ({ ...prev, category_id: presetLibraryId }));
    }
  }, [playbook, isEditing, presetLibraryId]);

  const handleSavePlaybook = async () => {
    if (!playbookData?.title || !playbookData?.category_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (isEditing && playbookId) {
      updatePlaybook({ id: playbookId, ...playbookData });
    } else {
      createPlaybook(playbookData, {
        onSuccess: (newPlaybook: any) => {
          navigate(`/knowledge-base/edit/${newPlaybook.id}`);
        }
      });
    }
  };

  const handleAddCard = () => {
    setEditingCard({
      card_number: (cards?.length || 0) + 1,
      title: '',
      content: { type: 'doc', content: [{ type: 'paragraph' }] },
      template: 'blank'
    });
    setShowCardEditor(true);
  };

  const handleEditCard = (card: any) => {
    setEditingCard(card);
    setShowCardEditor(true);
  };

  const handleSaveCard = (cardData: any) => {
    if (cardData.id) {
      cardEditor.updateCard(cardData);
    } else {
      cardEditor.createCard(cardData);
    }
  };

  const handleDeleteCard = (cardId: string) => {
    if (confirm('Are you sure you want to delete this card?')) {
      cardEditor.deleteCard(cardId);
    }
  };

  const handleReorderCards = (updates: { id: string; card_number: number }[]) => {
    cardEditor.reorderCards(updates);
  };

  if (isLoading || cardsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/knowledge-base')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Libraries
        </Button>
      
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">
              {isEditing ? 'Edit Playbook' : 'Create New Playbook'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isEditing ? 'Update playbook details and manage cards' : 'Set up your playbook and add learning content'}
            </p>
          </div>
          <Button 
            onClick={handleSavePlaybook}
            disabled={isCreating || isUpdating || !playbookData?.title || !playbookData?.category_id}
          >
            <Save className="h-4 w-4 mr-2" />
            {isCreating || isUpdating ? 'Saving...' : 'Save Playbook'}
          </Button>
        </div>

        {/* Playbook Metadata */}
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6">Playbook Details</h2>
          <PlaybookMetadataForm 
            initialData={playbookData} 
            onChange={setPlaybookData}
            presetCategoryId={presetLibraryId}
          />
        </div>

        {/* Cards Section (only show if editing existing playbook) */}
        {isEditing && playbookId && (
          <>
            <Separator />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Chapters</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add and organize chapters for this playbook
                  </p>
                </div>
                <Button onClick={handleAddCard}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Chapter
                </Button>
              </div>

              <CardList
                cards={cards || []}
                onEdit={handleEditCard}
                onDelete={handleDeleteCard}
                onReorder={handleReorderCards}
              />
            </div>
          </>
        )}

        {!isEditing && (
          <div className="bg-muted/50 border border-dashed rounded-lg p-8 text-center">
            <p className="text-muted-foreground">
              Save the playbook first to start adding chapters
            </p>
          </div>
        )}
      </div>

      {/* Card Editor Modal */}
      <CardEditorModal
        open={showCardEditor}
        onOpenChange={setShowCardEditor}
        card={editingCard}
        onSave={handleSaveCard}
      />
    </div>
  );
}
