import { motion } from "framer-motion";
import { TrendingUp, LayoutDashboard, MessagesSquare, Scale } from "lucide-react";
import { Card } from "@/components/ui/card";

const features = [
  {
    icon: TrendingUp,
    title: "Performance & Growth",
    description: "Track KPIs, coach your team, and plan your next quarter — all inside the same workspace.",
    modules: ["KPI Tracker", "Review & Roadmap", "Coaches Corner", "Nurture Calculator"],
  },
  {
    icon: LayoutDashboard,
    title: "Listings & Transactions",
    description: "Manage your pipeline from appraisal to settlement with vendor reporting and AI-generated copy.",
    modules: ["Listing Pipeline", "Vendor Reporting", "Listing Descriptions", "CMA Generator", "Transaction Management"],
  },
  {
    icon: MessagesSquare,
    title: "Communication & Collaboration",
    description: "Keep your team connected with messages, tasks, and role-play training scenarios.",
    modules: ["Messages", "Task Manager", "Role Play", "Feature Request"],
  },
  {
    icon: Scale,
    title: "Systems & Compliance",
    description: "Build a repeatable business with templates, knowledge bases, and AI-powered compliance guidance.",
    modules: ["Knowledge Base", "Compliance", "Templates"],
  },
];

export const FeatureHighlights = () => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Everything your team needs
          </h2>
          <p className="text-xl text-muted-foreground">
            Purpose-built modules for real estate professionals
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="p-6 h-full hover:shadow-lg transition-shadow">
                  <Icon className="h-10 w-10 text-primary mb-4" />
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {feature.description}
                  </p>
                  <ul className="space-y-1">
                    {feature.modules.map((module) => (
                      <li key={module} className="text-xs text-muted-foreground flex items-center">
                        <span className="w-1 h-1 bg-primary rounded-full mr-2" />
                        {module}
                      </li>
                    ))}
                  </ul>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
