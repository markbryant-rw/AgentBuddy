import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const plans = [
  {
    name: "Free Forever",
    price: "$0",
    period: "forever",
    description: "Perfect for getting started",
    features: [
      "Up to 3 team members",
      "Basic appraisal tracking",
      "Daily planner",
      "10 AI credits/month",
      "Community support",
    ],
    cta: "Start Free",
    popular: false,
    gradient: "from-gray-500 to-gray-600",
  },
  {
    name: "Basic",
    price: "$9.99",
    period: "/month",
    description: "For growing agents & small teams",
    features: [
      "Up to 10 team members",
      "Full appraisal pipeline",
      "Transaction management",
      "100 AI credits/month",
      "Beacon integration",
      "Email support",
    ],
    cta: "Get Basic",
    popular: false,
    gradient: "from-teal-500 to-cyan-500",
  },
  {
    name: "Professional",
    price: "$29",
    period: "/month",
    description: "Full power for agencies",
    features: [
      "Unlimited team members",
      "All workspaces unlocked",
      "Unlimited AI credits",
      "Advanced analytics",
      "Custom templates",
      "Priority support",
      "API access",
    ],
    cta: "Go Pro",
    popular: true,
    gradient: "from-purple-500 to-violet-600",
  },
];

export const PricingSimple = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Simple, honest pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            No hidden fees. No long-term contracts. Start free and upgrade when you're ready.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500 to-violet-600 text-white text-sm font-medium shadow-lg">
                    <Sparkles className="h-3.5 w-3.5" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className={`
                h-full rounded-2xl border bg-background p-6 
                ${plan.popular ? "border-purple-500/50 shadow-xl shadow-purple-500/10" : "border-border"}
              `}>
                {/* Header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-4xl font-bold bg-gradient-to-r ${plan.gradient} bg-clip-text text-transparent`}>
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${plan.gradient} flex items-center justify-center`}>
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link to="/auth?tab=signup" className="block">
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white"
                        : ""
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-muted-foreground mt-8"
        >
          All prices in NZD. Annual billing saves 20%. Cancel anytime.
        </motion.p>
      </div>
    </section>
  );
};
