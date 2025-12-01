import { useState } from "react";
import { Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useTeam } from "@/hooks/useTeam";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const MeetingGenerator = () => {
  const { team } = useTeam();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    if (!team?.id) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-team-meeting", {
        body: { teamId: team.id },
      });

      if (error) throw error;

      toast({
        title: "Meeting outline generated!",
        description: "Your AI-powered team meeting outline is ready.",
      });

      setOpen(false);
      
      // Navigate to the new note
      if (data?.noteId) {
        navigate(`/notes/${data.noteId}`);
      }
    } catch (error: any) {
      console.error("Error generating meeting:", error);
      toast({
        title: "Error generating meeting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate Weekly Meeting
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate AI Team Meeting Outline</DialogTitle>
          <DialogDescription>
            Automatically create a comprehensive weekly team meeting agenda based on your team's activity, 
            KPIs, pipeline, transactions, and goals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-3 p-4 border rounded-lg bg-muted/30">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">This week's meeting will include:</p>
              <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                <li>• Last week's wins and achievements</li>
                <li>• Current pipeline status and breakdown</li>
                <li>• Active transactions and upcoming settlements</li>
                <li>• This week's priorities and tasks</li>
                <li>• Monthly goals and targets</li>
                <li>• Team shoutouts and recognition</li>
              </ul>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> The AI will analyze your team's data from the past week to create 
              a comprehensive, data-driven meeting outline. The note will be automatically shared with 
              your entire team.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isGenerating}>
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Meeting
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
