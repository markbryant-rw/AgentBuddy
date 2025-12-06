import { ComingSoonTemplate } from '@/components/ComingSoonTemplate';
import { MessageSquare } from 'lucide-react';

export default function OfficeManagerMessages() {
  return (
    <ComingSoonTemplate
      icon={MessageSquare}
      title="Messages"
      description="Team messaging and collaboration hub"
      category="communication"
    />
  );
}
