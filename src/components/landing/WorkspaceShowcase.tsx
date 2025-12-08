import { motion } from "framer-motion";
import { useState } from "react";
import { CalendarDays, Target, Wallet, Settings, TrendingUp, MessageCircle } from "lucide-react";

const workspaces = [
  {
    id: "plan",
    name: "Plan",
    emoji: "📋",
    icon: CalendarDays,
    gradient: "from-blue-500 to-indigo-600",
    bgGradient: "from-blue-500/10 to-indigo-600/10",
    borderColor: "border-blue-500/30",
    description: "Organize your day, hit your targets",
    features: [
      "Daily planner with smart task prioritization",
      "Weekly goals and KPI tracking",
      "Quarterly planning with progress visualization",
      "AI-powered schedule optimization",
    ],
  },
  {
    id: "prospect",
    name: "Prospect",
    emoji: "🎯",
    icon: Target,
    gradient: "from-teal-500 to-cyan-500",
    bgGradient: "from-teal-500/10 to-cyan-500/10",
    borderColor: "border-teal-500/30",
    description: "Track every appraisal, win more listings",
    features: [
      "Appraisal tracking from first visit to listing",
      "Stage-based workflow: VAP → MAP → LAP",
      "Vendor engagement scoring with Beacon",
      "Automated follow-up reminders",
    ],
  },
  {
    id: "transact",
    name: "Transact",
    emoji: "💰",
    icon: Wallet,
    gradient: "from-amber-500 to-orange-500",
    bgGradient: "from-amber-500/10 to-orange-500/10",
    borderColor: "border-amber-500/30",
    description: "Manage deals from signed to settled",
    features: [
      "Transaction pipeline with Kanban board",
      "Automated task templates per stage",
      "Settlement timeline tracking",
      "Commission and revenue forecasting",
    ],
  },
  {
    id: "operate",
    name: "Operate",
    emoji: "⚙️",
    icon: Settings,
    gradient: "from-purple-500 to-violet-600",
    bgGradient: "from-purple-500/10 to-violet-600/10",
    borderColor: "border-purple-500/30",
    description: "Run your business like a pro",
    features: [
      "Project management with Kanban boards",
      "Team task assignments and tracking",
      "Notes and document collaboration",
      "Service provider directory",
    ],
  },
  {
    id: "grow",
    name: "Grow",
    emoji: "📈",
    icon: TrendingUp,
    gradient: "from-emerald-500 to-green-500",
    bgGradient: "from-emerald-500/10 to-green-500/10",
    borderColor: "border-emerald-500/30",
    description: "Learn, improve, dominate your market",
    features: [
      "AI coaching for scripts and objections",
      "Knowledge base with team playbooks",
      "Performance analytics and insights",
      "Training resources and best practices",
    ],
  },
  {
    id: "engage",
    name: "Engage",
    emoji: "💬",
    icon: MessageCircle,
    gradient: "from-pink-500 to-rose-500",
    bgGradient: "from-pink-500/10 to-rose-500/10",
    borderColor: "border-pink-500/30",
    description: "Connect with your team and network",
    features: [
      "Team messaging and channels",
      "Direct messages with colleagues",
      "Activity feed and notifications",
      "Referral network connections",
    ],
  },
];

export const WorkspaceShowcase = () => {
  const [activeWorkspace, setActiveWorkspace] = useState(workspaces[0]);

  return (
    <section className="py-24 bg-muted/30 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            6 workspaces. One platform.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every aspect of your real estate business, organized and connected.
          </p>
        </motion.div>

        {/* Workspace tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap justify-center gap-2 mb-12"
        >
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              onClick={() => setActiveWorkspace(workspace)}
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300
                ${activeWorkspace.id === workspace.id
                  ? `bg-gradient-to-r ${workspace.gradient} text-white shadow-lg`
                  : "bg-background hover:bg-muted border border-border"
                }
              `}
            >
              <span className="text-lg">{workspace.emoji}</span>
              <span className="font-medium">{workspace.name}</span>
            </button>
          ))}
        </motion.div>

        {/* Active workspace details */}
        <motion.div
          key={activeWorkspace.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="max-w-4xl mx-auto"
        >
          <div className={`relative rounded-3xl border ${activeWorkspace.borderColor} bg-gradient-to-br ${activeWorkspace.bgGradient} p-8 md:p-12`}>
            {/* Glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${activeWorkspace.gradient} opacity-5 rounded-3xl`} />
            
            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              {/* Left: Info */}
              <div>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${activeWorkspace.gradient} flex items-center justify-center shadow-lg`}>
                    <span className="text-3xl">{activeWorkspace.emoji}</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">{activeWorkspace.name}</h3>
                    <p className="text-muted-foreground">{activeWorkspace.description}</p>
                  </div>
                </div>

                <ul className="space-y-3 mt-6">
                  {activeWorkspace.features.map((feature, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-start gap-3"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${activeWorkspace.gradient} mt-2`} />
                      <span className="text-muted-foreground">{feature}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>

              {/* Right: Visual representation */}
              <div className="relative">
                <div className="aspect-[4/3] rounded-2xl bg-background/50 backdrop-blur border border-border/50 overflow-hidden shadow-2xl">
                  {/* Mock UI */}
                  <div className="p-4 border-b border-border/50 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-amber-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 h-6 rounded-md bg-muted/50 mx-4" />
                  </div>
                  <div className="p-4 space-y-3">
                    <div className={`h-8 w-32 rounded-lg bg-gradient-to-r ${activeWorkspace.gradient} opacity-80`} />
                    <div className="grid grid-cols-3 gap-3">
                      <div className="h-20 rounded-lg bg-muted/50" />
                      <div className="h-20 rounded-lg bg-muted/50" />
                      <div className="h-20 rounded-lg bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-full rounded bg-muted/50" />
                      <div className="h-4 w-3/4 rounded bg-muted/50" />
                      <div className="h-4 w-5/6 rounded bg-muted/50" />
                    </div>
                  </div>
                </div>

                {/* Floating badge */}
                <motion.div
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`absolute -top-4 -right-4 px-4 py-2 rounded-full bg-gradient-to-r ${activeWorkspace.gradient} text-white text-sm font-medium shadow-lg`}
                >
                  {activeWorkspace.name} Workspace
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
