import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const plans = [
  {
    id: "starter",
    name: "Starter",
    badge: "Free Forever",
    priceMonthly: 0,
    priceAnnual: 0,
    aiCredits: 0,
    features: [
      "Hub dashboard",
      "Task Manager",
      "Messages (text only)",
      "KPI Tracker (manual entry)",
      "1 Agent + 1 VA seat",
      "Community support",
    ],
    popular: false,
  },
  {
    id: "basic",
    name: "Basic",
    badge: null,
    priceMonthly: 9.99,
    priceAnnual: 7.99,
    aiCredits: 500,
    features: [
      "All Starter features",
      "File sharing in messages",
      "Vendor Reporting",
      "Listing Pipeline",
      "Nurture Calculator",
      "500 AI credits/month",
      "Unlimited team members",
      "Custom branding",
    ],
    popular: false,
  },
  {
    id: "professional",
    name: "Professional",
    badge: "Best Value",
    priceMonthly: 29,
    priceAnnual: 23.2,
    aiCredits: 2000,
    features: [
      "All Basic features",
      "Review & Roadmap",
      "Coaches Corner (AI coaching)",
      "CMA Generator",
      "AI Listing Descriptions",
      "Knowledge Base",
      "Compliance Module",
      "2,000 AI credits/month",
      "Analytics dashboard",
      "Priority support",
    ],
    popular: true,
  },
];

export const PricingCards = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section id="pricing" className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-xl text-muted-foreground mb-6">
            Start free, upgrade as you grow
          </p>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3">
            <Label htmlFor="annual-toggle" className={!isAnnual ? "font-semibold" : ""}>
              Monthly
            </Label>
            <Switch
              id="annual-toggle"
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
            />
            <Label htmlFor="annual-toggle" className={isAnnual ? "font-semibold" : ""}>
              Annual <span className="text-primary">(Save 20%)</span>
            </Label>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-12">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`p-8 h-full flex flex-col relative ${
                plan.popular ? "border-primary shadow-lg scale-105" : ""
              }`}>
                {plan.badge && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant={plan.popular ? "default" : "secondary"}>
                    {plan.badge}
                  </Badge>
                )}

                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">
                      ${isAnnual ? plan.priceAnnual : plan.priceMonthly}
                    </span>
                    <span className="text-muted-foreground">
                      {plan.priceMonthly > 0 ? " NZD/mo" : ""}
                    </span>
                  </div>
                  {plan.aiCredits > 0 && (
                    <p className="text-sm text-muted-foreground mt-2 flex items-center justify-center gap-1">
                      <Zap className="h-4 w-4 text-primary" />
                      {plan.aiCredits.toLocaleString()} AI credits/month
                    </p>
                  )}
                </div>

                <ul className="space-y-3 mb-8 flex-grow">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link to={`/auth?plan=${plan.id}&tab=signup`} className="w-full">
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"} size="lg">
                    {plan.priceMonthly === 0 ? "Start Free" : "Get Started"}
                  </Button>
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Team seat explainer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center space-y-4"
        >
          <p className="text-sm text-muted-foreground">
            🧑‍💼 1 Agent = 1 Seat · 👨‍💻 VAs = 50% Discount · 👀 Admins = Free View-Only
          </p>

          {/* AI Credit meter visualization */}
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="text-xs font-medium">AI Credits</span>
              <span className="text-xs text-muted-foreground">Shared across your team</span>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-muted-foreground/20" style={{ width: "0%" }} />
              </div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary/50" style={{ width: "25%" }} />
              </div>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: "100%" }} />
              </div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>Starter (0)</span>
              <span>Basic (500)</span>
              <span>Professional (2,000)</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
