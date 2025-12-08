import { motion } from "framer-motion";
import { ClipboardList, Target, FileText, Handshake, CheckCircle2, BarChart3, ArrowRight } from "lucide-react";

const journeySteps = [
  {
    icon: ClipboardList,
    emoji: "📋",
    title: "Appraisal",
    description: "Log the visit, track vendor details",
    automation: "Auto follow-up reminders",
    gradient: "from-teal-500 to-cyan-500",
  },
  {
    icon: Target,
    emoji: "🎯",
    title: "Opportunity",
    description: "Convert hot leads to pipeline",
    automation: "Propensity scoring with Beacon",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    icon: FileText,
    emoji: "📝",
    title: "Listing",
    description: "Agency agreement signed",
    automation: "Marketing task templates",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: Handshake,
    emoji: "💼",
    title: "Under Contract",
    description: "Offer accepted, contract exchanged",
    automation: "Settlement countdown tasks",
    gradient: "from-purple-500 to-violet-600",
  },
  {
    icon: CheckCircle2,
    emoji: "✅",
    title: "Settlement",
    description: "Keys handed over, deal done",
    automation: "Commission tracking",
    gradient: "from-emerald-500 to-green-500",
  },
  {
    icon: BarChart3,
    emoji: "📊",
    title: "Past Sales",
    description: "Historical data for insights",
    automation: "Market analysis reports",
    gradient: "from-pink-500 to-rose-500",
  },
];

export const PropertyJourney = () => {
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
            From appraisal to settlement
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            One continuous workflow. Data flows forward. Nothing falls through the cracks.
          </p>
        </motion.div>

        <div className="relative max-w-6xl mx-auto">

          {/* Steps */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {journeySteps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative group"
              >
                {/* Arrow between steps (mobile/tablet) */}
                {index < journeySteps.length - 1 && (
                  <div className="absolute -right-3 top-12 hidden lg:block z-10">
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                  </div>
                )}

                <div className="flex flex-col items-center text-center">
                  {/* Icon circle */}
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className={`
                      relative w-16 h-16 rounded-2xl bg-gradient-to-br ${step.gradient}
                      flex items-center justify-center shadow-lg mb-4
                      group-hover:shadow-xl transition-shadow
                    `}
                  >
                    <span className="text-2xl">{step.emoji}</span>
                    
                    {/* Step number */}
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                  </motion.div>

                  {/* Content */}
                  <h3 className="font-bold mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{step.description}</p>
                  
                  {/* Automation badge */}
                  <div className={`
                    text-xs px-3 py-1 rounded-full 
                    bg-gradient-to-r ${step.gradient} bg-opacity-10
                    border border-current/20
                  `}>
                    <span className="bg-gradient-to-r from-foreground/80 to-foreground/60 bg-clip-text">
                      {step.automation}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom callout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-gradient-to-r from-teal-500/10 to-purple-500/10 border border-teal-500/20">
            <span className="text-2xl">✨</span>
            <span className="text-sm font-medium">
              Every step automated. Every detail tracked. Every deal closed faster.
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
