import { ComingSoonTemplate } from '@/components/ComingSoonTemplate';
import { Handshake } from 'lucide-react';

const ComingSoon = () => {
  return (
    <ComingSoonTemplate
      icon={Handshake}
      title="Referrals Module"
      description="Agent collaboration and referral tracking system"
      category="communication"
    />
  );
};

export default ComingSoon;
