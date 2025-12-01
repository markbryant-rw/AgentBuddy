import { motion } from "framer-motion";
import { FileSpreadsheet, MessageSquare, StickyNote, CheckCircle2, LayoutDashboard, Zap } from "lucide-react";

export const ProblemSolution = () => {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="container mx-auto">
        <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Problem */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold">The chaos of real estate teamwork</h2>
            <p className="text-lg text-muted-foreground">
              Agents live in chaos — endless spreadsheets, Slack threads, and late-night vendor updates.
            </p>
            
            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-destructive/10">
                <FileSpreadsheet className="h-8 w-8 text-destructive" />
                <span className="text-xs text-center">Scattered spreadsheets</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-destructive/10">
                <MessageSquare className="h-8 w-8 text-destructive" />
                <span className="text-xs text-center">Lost messages</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-destructive/10">
                <StickyNote className="h-8 w-8 text-destructive" />
                <span className="text-xs text-center">Sticky note madness</span>
              </div>
            </div>
          </motion.div>

          {/* Solution */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold">The calm of AgentBuddy</h2>
            <p className="text-lg text-muted-foreground">
              AgentBuddy brings it all together: one place for KPIs, communication, and smart AI assistance.
            </p>
            
            <div className="grid grid-cols-3 gap-4 py-4">
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/10">
                <LayoutDashboard className="h-8 w-8 text-primary" />
                <span className="text-xs text-center">Unified dashboard</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/10">
                <CheckCircle2 className="h-8 w-8 text-primary" />
                <span className="text-xs text-center">Clear tasks</span>
              </div>
              <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/10">
                <Zap className="h-8 w-8 text-primary" />
                <span className="text-xs text-center">AI-powered</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
