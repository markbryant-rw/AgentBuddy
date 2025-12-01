import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Play } from "lucide-react";

export const BasecampHero = () => {
  return (
    <section className="relative py-20 md:py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary">
              Built for real estate. Trusted by teams.
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              Your friendly AI teammate for real estate — all in one place.
            </h1>
            
            <p className="text-xl text-muted-foreground leading-relaxed">
              Stop juggling spreadsheets, chat threads, and sticky notes. AgentBuddy brings everything your business needs into one simple, friendly workspace with AI assistance.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/auth?tab=signup">
                <Button size="lg" className="w-full sm:w-auto text-lg px-8">
                  Start Free Forever
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 gap-2">
                <Play className="h-5 w-5" />
                Watch Demo
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Free Forever · No Credit Card Required
            </p>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl border-2 shadow-2xl overflow-hidden">
              <div className="w-full h-full bg-background/80 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center space-y-4 p-8">
                  <div className="w-16 h-16 bg-primary/20 rounded-xl mx-auto" />
                  <p className="text-lg font-medium">Dashboard Preview</p>
                  <p className="text-sm text-muted-foreground">Hub · Tasks · KPIs · Messages</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
