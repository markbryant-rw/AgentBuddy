import { motion } from "framer-motion";
import { User, Building2, Check, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const agentFeatures = [
  "Track appraisals from first visit to listing signed",
  "Automated follow-up reminders that never slip",
  "AI coaching and listing description generator",
  "Daily planner that prioritizes your day",
  "Transaction task templates that run themselves",
  "Vendor engagement scoring with Beacon",
];

const agencyFeatures = [
  "See every agent's pipeline at a glance",
  "Standardized workflows across all teams",
  "Performance dashboards without the spreadsheets",
  "Instant visibility into team activity",
  "Office-wide KPI tracking and goals",
  "Bug reports and feature requests from your team",
];

interface PathCardProps {
  icon: typeof User;
  title: string;
  subtitle: string;
  features: string[];
  gradient: string;
  delay: number;
}

const PathCard = ({ icon: Icon, title, subtitle, features, gradient, delay }: PathCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
    className="relative group"
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity`} />
    <div className="relative bg-background/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 h-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <motion.li
            key={index}
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: delay + 0.1 + index * 0.05 }}
            className="flex items-start gap-3"
          >
            <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0 mt-0.5`}>
              <Check className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm text-muted-foreground">{feature}</span>
          </motion.li>
        ))}
      </ul>

      {/* CTA */}
      <Link to="/auth?tab=signup">
        <Button variant="outline" className="w-full group/btn">
          Get Started
          <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
        </Button>
      </Link>
    </div>
  </motion.div>
);

export const AudiencePathsSection = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Built for how you work
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you're a solo agent or running an office, AgentBuddy adapts to your needs.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <PathCard
            icon={User}
            title="For Agents & Small Teams"
            subtitle="Organize your chaos, close more deals"
            features={agentFeatures}
            gradient="from-teal-500 to-cyan-500"
            delay={0.1}
          />
          <PathCard
            icon={Building2}
            title="For Agencies & Offices"
            subtitle="Give your team superpowers"
            features={agencyFeatures}
            gradient="from-purple-500 to-violet-600"
            delay={0.2}
          />
        </div>
      </div>
    </section>
  );
};
