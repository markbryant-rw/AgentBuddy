import { useEffect } from "react";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { BasecampHero } from "@/components/landing/basecamp/BasecampHero";
import { ProblemSolutionTable } from "@/components/landing/basecamp/ProblemSolutionTable";
import { HowItWorksCarousel } from "@/components/landing/basecamp/HowItWorksCarousel";
import { SocialProofSection } from "@/components/landing/basecamp/SocialProofSection";
import { PricingPreview } from "@/components/landing/basecamp/PricingPreview";
import { FAQAccordion } from "@/components/landing/basecamp/FAQAccordion";
import { FinalCTASection } from "@/components/landing/basecamp/FinalCTASection";

export default function LandingAlt() {
  useEffect(() => {
    document.title = "AgentBuddy - Your AI Teammate for Real Estate";
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 
        'Stop juggling spreadsheets and chat threads. AgentBuddy brings tasks, KPIs, messages, listings, and AI coaching into one friendly workspace for real estate teams.'
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <LandingNav />
      <main>
        <BasecampHero />
        <ProblemSolutionTable />
        <HowItWorksCarousel />
        <SocialProofSection />
        <PricingPreview />
        <FAQAccordion />
        <FinalCTASection />
      </main>
      <LandingFooter />
    </div>
  );
}
