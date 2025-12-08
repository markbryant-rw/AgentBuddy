import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { STRIPE_PLANS } from "@/lib/stripe-plans";

const plans = [
  {
    ...STRIPE_PLANS.solo,
    features: [
      "Single user license",
      "Full appraisal pipeline",
      "Transaction management",
      "All 6 workspaces",
      "AI credits included",
      "Email support",
    ],
    cta: "Get Started",
    popular: false,
    gradient: "from-teal-500 to-cyan-500",
  },
  {
    ...STRIPE_PLANS.team,
    features: [
      "Up to 3 team members",
      "Full appraisal pipeline",
      "Transaction management",
      "All 6 workspaces",
      "AI credits included",
      "Team dashboards",
      "Priority support",
    ],
    cta: "Start with Team",
    popular: true,
    gradient: "from-purple-500 to-violet-600",
  },
];

export const PricingSimple = () => {
  const [isAnnual, setIsAnnual] = useState(false);

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
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-6">
            Invest in your business. Cancel anytime.
          </p>
          
          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3">
            <span className={`text-sm ${!isAnnual ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              Monthly
            </span>
            <Switch checked={isAnnual} onCheckedChange={setIsAnnual} />
            <span className={`text-sm ${isAnnual ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              Yearly
            </span>
            {isAnnual && (
              <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">
                2 months free!
              </span>
            )}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
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
                      ${isAnnual ? plan.amountAnnual.toFixed(2) : plan.amountMonthly.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      {isAnnual ? "/year" : "/month"}
                    </span>
                  </div>
                  {isAnnual && (
                    <p className="text-xs text-muted-foreground mt-1">
                      (${(plan.amountAnnual / 12).toFixed(2)}/month)
                    </p>
                  )}
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

                {/* CTA - passes plan and billing to signup */}
                <Link 
                  to={`/auth?tab=signup&plan=${plan.id}&billing=${isAnnual ? 'annual' : 'monthly'}`} 
                  className="block"
                >
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
          All prices in NZD. Cancel anytime.
        </motion.p>
      </div>
    </section>
  );
};
