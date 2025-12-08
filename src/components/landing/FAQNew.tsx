import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Does this replace my CRM?",
    answer: "No! AgentBuddy is designed to work alongside your existing CRM, not replace it. Keep using AgentBox, VaultRE, Rex, or whatever you love for contact management and deal tracking. AgentBuddy adds the layer you're missing: AI assistance, team visibility, appraisal tracking, and automated workflows.",
  },
  {
    question: "How long does it take to get started?",
    answer: "About 5 minutes. Sign up, invite your team, and you're ready to go. There's no complex setup or data migration required. You can start tracking appraisals and using the daily planner immediately.",
  },
  {
    question: "Can my assistant or VA use it?",
    answer: "Absolutely! Each team member gets their own seat with appropriate permissions. Assistants can help manage tasks, update transactions, and coordinate with the team. You control who sees what.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. We use enterprise-grade encryption (AES-256) for data at rest and TLS 1.3 for data in transit. Your data is stored in secure, SOC 2 compliant data centers. We never share or sell your information.",
  },
  {
    question: "What if I want to cancel?",
    answer: "No problem. There are no long-term contracts or cancellation fees. You can downgrade to the free tier or cancel entirely at any time. Your data remains available for 30 days after cancellation.",
  },
  {
    question: "Does it work on mobile?",
    answer: "Yes! AgentBuddy is fully responsive and works great on phones and tablets. Access your daily planner, check appraisals, and stay on top of tasks from anywhere.",
  },
  {
    question: "What is Beacon integration?",
    answer: "Beacon is our vendor engagement tracking system. When you send appraisal reports through Beacon, it tracks how vendors engage — views, time spent, email opens — and calculates a propensity score. You'll know exactly when a vendor is ready to list.",
  },
  {
    question: "Do you offer training?",
    answer: "Yes! We provide video tutorials, a comprehensive knowledge base, and live onboarding sessions for Professional plan subscribers. Our support team is also available to help you get the most out of AgentBuddy.",
  },
];

export const FAQNew = () => {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Frequently asked questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Got questions? We've got answers.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border rounded-xl px-6 data-[state=open]:bg-muted/30"
              >
                <AccordionTrigger className="text-left font-medium hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-5">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="text-center mt-12"
        >
          <p className="text-muted-foreground">
            Still have questions?{" "}
            <a href="mailto:support@agentbuddy.co" className="text-primary hover:underline font-medium">
              Get in touch
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};
