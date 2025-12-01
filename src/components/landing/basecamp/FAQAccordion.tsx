import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";

const faqs = [
  {
    question: "Can my assistant or VA use it too?",
    answer: "Absolutely. AgentBuddy is designed for entire teams — agents, admins, VAs, and managers. Everyone gets their own login and permissions."
  },
  {
    question: "What happens if I add more team members?",
    answer: "You can start with 1 user on the free plan and add more anytime. Team seats are just $9.99/mo each on Basic, or upgrade to Pro for unlimited users."
  },
  {
    question: "Is my data secure?",
    answer: "Yes. All data is encrypted at rest and in transit. We use enterprise-grade infrastructure and never share your information with third parties."
  },
  {
    question: "How do AI credits work?",
    answer: "AI credits are used for features like listing descriptions, vendor reports, and coaching scenarios. Free tier gets 10/month, Basic gets 100/month, Pro gets unlimited."
  },
  {
    question: "Can I cancel anytime?",
    answer: "Yes, no contracts or cancellation fees. You can downgrade or cancel your subscription anytime from your account settings."
  },
  {
    question: "Do you offer a demo or onboarding?",
    answer: "Yes! Book a free 10-minute demo with our team, or dive in and explore on your own — the interface is intuitive and self-guided."
  }
];

export const FAQAccordion = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Common questions</h2>
          <p className="text-xl text-muted-foreground">
            Everything you need to know
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-background rounded-lg border px-6"
              >
                <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};
