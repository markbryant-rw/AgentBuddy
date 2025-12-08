import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingHeroNew } from "@/components/landing/LandingHeroNew";
import { IntegrationSection } from "@/components/landing/IntegrationSection";
import { AudiencePathsSection } from "@/components/landing/AudiencePathsSection";
import { WorkspaceShowcase } from "@/components/landing/WorkspaceShowcase";
import { PropertyJourney } from "@/components/landing/PropertyJourney";
import { SocialProofNew } from "@/components/landing/SocialProofNew";
import { BeaconFeature } from "@/components/landing/BeaconFeature";
import { PricingSimple } from "@/components/landing/PricingSimple";
import { FAQNew } from "@/components/landing/FAQNew";
import { FinalCTANew } from "@/components/landing/FinalCTANew";

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "AgentBuddy - Give Your Real Estate Business Superpowers";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 
        'AgentBuddy adds AI assistance, team coordination, and transaction tracking to your real estate workflow — without replacing your CRM. Start free today.'
      );
    }
  }, []);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      
      <main>
        <LandingHeroNew />
        <IntegrationSection />
        <AudiencePathsSection />
        <WorkspaceShowcase />
        <PropertyJourney />
        <SocialProofNew />
        <BeaconFeature />
        <PricingSimple />
        <FAQNew />
        <FinalCTANew />
      </main>
      
      <LandingFooter />
    </div>
  );
};

export default Landing;
