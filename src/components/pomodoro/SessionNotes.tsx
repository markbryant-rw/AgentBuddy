import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface SessionNotesProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SessionNotes = ({ value, onChange, placeholder }: SessionNotesProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="session-notes" className="text-sm font-medium">
        Session Notes (Optional)
      </Label>
      <Textarea
        id="session-notes"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || "What did you accomplish? (e.g., 'Called 15 prospects, 2 follow-ups scheduled')"}
        className="min-h-[80px] resize-none"
      />
    </div>
  );
};
