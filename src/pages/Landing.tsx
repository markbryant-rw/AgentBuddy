import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LandingHero } from "@/components/landing/LandingHero";
import { ProblemSolution } from "@/components/landing/ProblemSolution";
import { FeatureHighlights } from "@/components/landing/FeatureHighlights";
import { PricingCards } from "@/components/landing/PricingCards";
import { ReferralBanner } from "@/components/landing/ReferralBanner";
import { Testimonials } from "@/components/landing/Testimonials";
import { CTASection } from "@/components/landing/CTASection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { LandingNav } from "@/components/landing/LandingNav";

const Landing = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
        <LandingHero />
        <ProblemSolution />
        <FeatureHighlights />
        <PricingCards />
        <ReferralBanner />
        <Testimonials />
        <CTASection />
      </main>
      
      <LandingFooter />
    </div>
  );
};

export default Landing;
