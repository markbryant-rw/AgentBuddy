import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calendar } from "lucide-react";

export const CTASection = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-background to-primary/5">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center space-y-6"
        >
          <h2 className="text-4xl md:text-5xl font-bold">
            Start your free account today
          </h2>
          
          <p className="text-xl text-muted-foreground">
            You'll never want to manage your team any other way.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link to="/auth?tab=signup">
              <Button size="lg" className="text-lg px-8">
                Create My Account <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="https://calendly.com" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="text-lg px-8">
                <Calendar className="mr-2 h-5 w-5" />
                Book a 10-min Demo
              </Button>
            </a>
          </div>

          <p className="text-sm text-muted-foreground pt-2">
            Free Forever · No Credit Card Required
          </p>
        </motion.div>
      </div>
    </section>
  );
};
