import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

const tiers = [
  {
    name: "Free Forever",
    price: "$0",
    period: "forever",
    highlights: [
      "1 user",
      "Core modules",
      "Community access",
      "Basic reporting"
    ],
    cta: "Start Free",
    ctaVariant: "outline" as const
  },
  {
    name: "Basic",
    price: "$9.99",
    period: "per month",
    highlights: [
      "Up to 3 users",
      "Automation tools",
      "AI credits included",
      "Priority support"
    ],
    cta: "Start Free",
    ctaVariant: "default" as const,
    popular: true
  },
  {
    name: "Pro",
    price: "$29",
    period: "per month",
    highlights: [
      "Full team access",
      "Advanced analytics",
      "Unlimited AI credits",
      "Custom integrations"
    ],
    cta: "Start Free",
    ctaVariant: "outline" as const
  }
];

export const PricingPreview = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-4xl md:text-5xl font-bold">Simple, honest pricing</h2>
          <p className="text-xl text-muted-foreground">
            Start free. Scale when you're ready.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`h-full relative ${tier.popular ? 'border-primary border-2 shadow-xl' : ''}`}>
                {tier.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-8 pt-8">
                  <CardTitle className="text-2xl mb-2">{tier.name}</CardTitle>
                  <div>
                    <span className="text-5xl font-bold">{tier.price}</span>
                    {tier.price !== "$0" && <span className="text-muted-foreground ml-2">{tier.period}</span>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {tier.highlights.map((highlight, i) => (
                      <li key={highlight} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth?tab=signup" className="block">
                    <Button variant={tier.ctaVariant} className="w-full" size="lg">
                      {tier.cta}
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12 space-y-4">
          <Link to="/pricing">
            <Button variant="ghost" size="lg">
              Compare Plans →
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground">
            Add team members anytime. No contracts.
          </p>
        </div>
      </div>
    </section>
  );
};
