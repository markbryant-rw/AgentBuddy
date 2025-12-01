import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, Square, X, Send } from "lucide-react";
import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { useEffect } from "react";

interface VoiceRecorderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (audioBlob: Blob, duration: number) => Promise<void>;
}

export function VoiceRecorder({ open, onOpenChange, onSend }: VoiceRecorderProps) {
  const {
    recordingState,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
    reset,
  } = useVoiceRecording();

  useEffect(() => {
    if (open && recordingState === "idle" && !audioBlob) {
      startRecording();
    }
  }, [open, recordingState, audioBlob, startRecording]);

  const handleSend = async () => {
    if (audioBlob) {
      await onSend(audioBlob, duration);
      reset();
      onOpenChange(false);
    }
  };

  const handleCancel = () => {
    cancelRecording();
    onOpenChange(false);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      if (!open) handleCancel();
    }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Voice Note</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-6">
          {recordingState === "recording" && (
            <>
              <div className="relative">
                <div className="absolute inset-0 animate-ping">
                  <div className="h-24 w-24 rounded-full bg-destructive opacity-20" />
                </div>
                <div className="relative h-24 w-24 rounded-full bg-destructive/20 flex items-center justify-center">
                  <Mic className="h-12 w-12 text-destructive" />
                </div>
              </div>

              <div className="text-center">
                <p className="text-3xl font-mono font-semibold">{formatDuration(duration)}</p>
                <p className="text-sm text-muted-foreground mt-1">Recording...</p>
              </div>

              <Button onClick={stopRecording} size="lg" className="gap-2">
                <Square className="h-4 w-4" />
                Stop Recording
              </Button>
            </>
          )}

          {recordingState === "idle" && audioBlob && (
            <>
              <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center">
                <Mic className="h-12 w-12 text-primary" />
              </div>

              <div className="text-center">
                <p className="text-2xl font-semibold">{formatDuration(duration)}</p>
                <p className="text-sm text-muted-foreground mt-1">Recording complete</p>
              </div>

              <audio src={URL.createObjectURL(audioBlob)} controls className="w-full" />

              <div className="flex gap-2 w-full">
                <Button onClick={handleCancel} variant="outline" className="flex-1 gap-2">
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button onClick={handleSend} className="flex-1 gap-2">
                  <Send className="h-4 w-4" />
                  Send
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
