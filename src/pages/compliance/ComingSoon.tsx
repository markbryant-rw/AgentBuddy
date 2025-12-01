import { ComingSoonTemplate } from '@/components/ComingSoonTemplate';
import { ShieldCheck } from 'lucide-react';

const ComingSoon = () => {
  return (
    <ComingSoonTemplate
      icon={ShieldCheck}
      title="Compliance Hub"
      description="AI-powered REINZ guidance for clauses and compliance"
      category="systems"
    />
  );
};

export default ComingSoon;
