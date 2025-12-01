import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export const LandingHero = () => {
  return (
    <section className="relative pt-32 pb-20 px-4 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-background" />
      
      <div className="container mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto text-center space-y-6"
        >
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            Your friendly AI teammate for real estate success
          </h1>
          
          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
            Everything you need to run your real estate business - tasks, KPIs, messages, listings, and AI coaching in one simple workspace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/auth?tab=signup">
              <Button size="lg" className="text-lg px-8">
                Start Free <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground pt-2">
            No setup required · Free Forever · Your AI teammate is ready
          </p>
        </motion.div>

        {/* Dashboard preview mockup */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 max-w-6xl mx-auto"
        >
          <div className="relative rounded-lg border bg-card shadow-2xl overflow-hidden aspect-video">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-muted-foreground">Dashboard Preview</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
