import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useGiphy } from "@/hooks/useGiphy";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GifPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectGif: (gifUrl: string, gifTitle: string) => void;
}

export const GifPicker = ({ open, onOpenChange, onSelectGif }: GifPickerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const { searchGifs, getTrending, isLoading } = useGiphy();

  const loadTrending = useCallback(async () => {
    const trending = await getTrending();
    setGifs(trending);
  }, [getTrending]);

  useEffect(() => {
    if (open) {
      loadTrending();
    }
  }, [open, loadTrending]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const results = await searchGifs(query);
      setGifs(results);
    } else {
      loadTrending();
    }
  };

  const handleSelectGif = (gif: any) => {
    onSelectGif(gif.images.original.url, gif.title);
    onOpenChange(false);
    setSearchQuery("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Choose a GIF</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search GIFs..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="relative">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto pr-2">
                {gifs.map((gif) => (
                  <button
                    key={gif.id}
                    onClick={() => handleSelectGif(gif)}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden",
                      "hover:ring-2 hover:ring-primary transition-all",
                      "focus:outline-none focus:ring-2 focus:ring-primary"
                    )}
                  >
                    <img
                      src={gif.images.fixed_height.url}
                      alt={gif.title}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            Powered by{" "}
            <a
              href="https://giphy.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-foreground"
            >
              GIPHY
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
