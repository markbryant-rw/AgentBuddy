import { ComingSoonTemplate } from '@/components/ComingSoonTemplate';
import { CheckSquare } from 'lucide-react';

const ComingSoon = () => {
  return (
    <ComingSoonTemplate
      icon={CheckSquare}
      title="Transaction Management"
      description="Listed-2-Live checklist for managing new listings from contract to settlement"
      category="systems"
    />
  );
};

export default ComingSoon;
