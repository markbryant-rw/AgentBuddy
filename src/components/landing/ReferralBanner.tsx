import { motion } from "framer-motion";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

export const ReferralBanner = () => {
  return (
    <section className="py-16 px-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center space-y-4"
        >
          <div className="flex justify-center">
            <div className="p-3 bg-primary/10 rounded-full">
              <Gift className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold">
            Invite your network → Earn rewards!
          </h2>
          
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Get 1 month free <span className="font-semibold">OR</span> +1,000 AI credits for every team that joins through your referral.
          </p>

          <Button size="lg" variant="outline">
            Learn More About Referrals
          </Button>
        </motion.div>
      </div>
    </section>
  );
};
