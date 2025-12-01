import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Link2, ExternalLink, Plus, X, Copy, Check } from 'lucide-react';
import type { TransactionLink } from '@/hooks/useTransactions';
import { AddLinkDialog } from './AddLinkDialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TransactionLinksSectionProps {
  links: TransactionLink[];
  onAddLink: (link: TransactionLink) => void;
  onDeleteLink: (linkId: string) => void;
}

export const TransactionLinksSection = ({ links, onAddLink, onDeleteLink }: TransactionLinksSectionProps) => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [hoveredLinkId, setHoveredLinkId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  const handleCopyUrl = async (url: string, linkId: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(linkId);
      toast.success('Link copied to clipboard');
      
      setTimeout(() => {
        setCopiedLinkId(null);
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Links
          </h3>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setAddDialogOpen(true)}
            className="h-7 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Link
          </Button>
        </div>

        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No links added yet</p>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                className="group flex items-center justify-between p-2 rounded-md hover:bg-accent transition-colors"
                onMouseEnter={() => setHoveredLinkId(link.id)}
                onMouseLeave={() => setHoveredLinkId(null)}
              >
                <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
                  <Link2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate">{link.title}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                      hoveredLinkId === link.id && "opacity-100"
                    )}
                    onClick={() => window.open(link.url, '_blank', 'noopener,noreferrer')}
                    title="Open link"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity",
                      hoveredLinkId === link.id && "opacity-100"
                    )}
                    onClick={() => handleCopyUrl(link.url, link.id)}
                    title="Copy link"
                  >
                    {copiedLinkId === link.id ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive",
                      hoveredLinkId === link.id && "opacity-100"
                    )}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDeleteLink(link.id);
                    }}
                    title="Delete link"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddLinkDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={onAddLink}
      />
    </>
  );
};
