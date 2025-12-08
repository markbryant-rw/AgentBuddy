import { motion } from "framer-motion";
import { Flame, Eye, Mail, Clock, TrendingUp, Bell } from "lucide-react";

const engagementLevels = [
  { score: "70+", label: "Hot Lead", icon: "🔥", color: "text-red-500", bgColor: "bg-red-500/10", description: "Ready to list now" },
  { score: "40-69", label: "Warm", icon: "🟡", color: "text-amber-500", bgColor: "bg-amber-500/10", description: "Actively considering" },
  { score: "20-39", label: "Interested", icon: "🔵", color: "text-blue-500", bgColor: "bg-blue-500/10", description: "Engaged with content" },
  { score: "1-19", label: "Viewed", icon: "👁️", color: "text-gray-500", bgColor: "bg-gray-500/10", description: "Just looking" },
];

const metrics = [
  { icon: Eye, label: "Total views", value: "12" },
  { icon: Clock, label: "Time spent", value: "8m 32s" },
  { icon: Mail, label: "Email opens", value: "5" },
  { icon: TrendingUp, label: "Propensity", value: "78" },
];

export const BeaconFeature = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/20 text-sm font-medium text-red-500 mb-6">
              <Flame className="h-4 w-4" />
              <span>Beacon Integration</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Know when vendors are ready to list
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8">
              Beacon tracks how vendors engage with your appraisal reports — views, time spent, 
              email opens — and calculates a propensity score so you know exactly when to follow up.
            </p>

            {/* Engagement levels */}
            <div className="space-y-3 mb-8">
              {engagementLevels.map((level, index) => (
                <motion.div
                  key={level.label}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl ${level.bgColor} border border-current/10`}
                >
                  <span className="text-2xl">{level.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${level.color}`}>{level.label}</span>
                      <span className="text-xs text-muted-foreground">({level.score})</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{level.description}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4 text-teal-500" />
              <span>Get instant alerts when leads hit 70+ score</span>
            </div>
          </motion.div>

          {/* Right visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-3xl blur-3xl" />
            
            {/* Card */}
            <div className="relative bg-background/80 backdrop-blur-xl rounded-3xl border border-border p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="font-bold text-lg">42 Example Street</h4>
                  <p className="text-sm text-muted-foreground">John & Mary Smith</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                  <Flame className="h-4 w-4 text-red-500" />
                  <span className="font-bold text-red-500">78</span>
                </div>
              </div>

              {/* Metrics grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                  >
                    <metric.icon className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">{metric.label}</div>
                      <div className="font-bold">{metric.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Propensity bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Propensity Score</span>
                  <span className="font-bold text-red-500">Hot Lead 🔥</span>
                </div>
                <div className="h-3 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: "78%" }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.5 }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500"
                  />
                </div>
              </div>

              {/* CTA hint */}
              <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">Time to follow up!</div>
                    <div className="text-xs text-muted-foreground">This vendor is highly engaged</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
