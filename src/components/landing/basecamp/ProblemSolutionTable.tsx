import { Check, X } from "lucide-react";
import { motion } from "framer-motion";

const problemSolutions = [
  {
    pain: "No one knows who's doing what.",
    fix: "Assign & track every task — nothing slips through the cracks."
  },
  {
    pain: "Our CRM isn't built for teams.",
    fix: "AgentBuddy connects people, projects, and listings together."
  },
  {
    pain: "We waste time chasing updates.",
    fix: "Daily Hub view keeps everyone aligned."
  },
  {
    pain: "Too many tools, too much noise.",
    fix: "Replace chat, tasks, and reporting with one system."
  }
];

export const ProblemSolutionTable = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-5xl font-bold text-center mb-16"
          >
            The chaos. The calm.
          </motion.h2>
          
          <div className="space-y-6">
            {problemSolutions.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="grid md:grid-cols-2 gap-6 bg-background rounded-xl p-6 border hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start gap-3">
                  <X className="h-5 w-5 text-destructive flex-shrink-0 mt-1" />
                  <p className="text-muted-foreground">{item.pain}</p>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                  <p className="font-medium">{item.fix}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
