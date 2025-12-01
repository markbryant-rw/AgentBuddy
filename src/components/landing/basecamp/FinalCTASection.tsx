import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

export const FinalCTASection = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            You run the team.<br />We'll run the system.
          </h2>
          
          <p className="text-2xl text-muted-foreground">
            Start free today — no card required.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Link to="/auth?tab=signup">
              <Button size="lg" className="w-full sm:w-auto text-lg px-8">
                Create My Account
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-8 gap-2">
              <Calendar className="h-5 w-5" />
              Book a 10-min Demo
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground pt-4">
            Free Forever · No Credit Card Required
          </p>
        </motion.div>
      </div>
    </section>
  );
};
