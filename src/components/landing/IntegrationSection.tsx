import { motion } from "framer-motion";
import { Plus, Zap, Brain, Users, BarChart3 } from "lucide-react";

const crmLogos = [
  { name: "AgentBox", color: "bg-blue-500" },
  { name: "VaultRE", color: "bg-purple-500" },
  { name: "Rex", color: "bg-orange-500" },
  { name: "Domain", color: "bg-teal-500" },
  { name: "realestate.com.au", color: "bg-red-500" },
];

const superpowers = [
  { icon: Brain, label: "AI Assistance", color: "text-purple-500" },
  { icon: Zap, label: "Automation", color: "text-amber-500" },
  { icon: Users, label: "Team Sync", color: "text-teal-500" },
  { icon: BarChart3, label: "Smart Insights", color: "text-emerald-500" },
];

export const IntegrationSection = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            We play nice with your existing stack
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Keep your CRM for contacts and deals. AgentBuddy adds the layer you're missing: 
            AI-powered appraisal tracking, automated task workflows, team visibility, and vendor engagement scoring.
          </p>
        </motion.div>

        {/* Visual equation */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12"
        >
          {/* CRM logos */}
          <div className="flex flex-col items-center">
            <span className="text-sm font-medium text-muted-foreground mb-4">Your Current Tools</span>
            <div className="flex flex-wrap justify-center gap-3">
              {crmLogos.map((crm, index) => (
                <motion.div
                  key={crm.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background border border-border shadow-sm"
                >
                  <div className={`w-6 h-6 rounded-lg ${crm.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {crm.name[0]}
                  </div>
                  <span className="text-sm font-medium">{crm.name}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Plus sign */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, type: "spring" }}
            className="flex-shrink-0"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Plus className="h-7 w-7 text-white" />
            </div>
          </motion.div>

          {/* AgentBuddy */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6 }}
            className="flex flex-col items-center"
          >
            <span className="text-sm font-medium text-muted-foreground mb-4">AgentBuddy</span>
            <div className="px-6 py-4 rounded-2xl bg-gradient-to-br from-teal-500/10 to-cyan-500/10 border border-teal-500/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center">
                  <span className="text-xl">🏠</span>
                </div>
                <span className="text-lg font-bold">AgentBuddy</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {superpowers.map((power, index) => (
                  <div
                    key={power.label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background text-sm"
                  >
                    <power.icon className={`h-3.5 w-3.5 ${power.color}`} />
                    <span>{power.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Equals sign */}
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.7, type: "spring" }}
            className="flex-shrink-0 hidden lg:flex"
          >
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/30">
              =
            </div>
          </motion.div>

          {/* Result */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.8 }}
            className="flex flex-col items-center hidden lg:flex"
          >
            <span className="text-sm font-medium text-muted-foreground mb-4">The Result</span>
            <div className="px-6 py-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
              <div className="text-center">
                <span className="text-3xl mb-2 block">🚀</span>
                <span className="text-lg font-bold bg-gradient-to-r from-emerald-500 to-green-500 bg-clip-text text-transparent">
                  Superpowered Workflow
                </span>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.9 }}
          className="text-center text-sm text-muted-foreground mt-12"
        >
          AgentBuddy doesn't try to replace your CRM. It makes everything you already do, better.
        </motion.p>
      </div>
    </section>
  );
};
