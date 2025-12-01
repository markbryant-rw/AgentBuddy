import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const testimonials = [
  {
    quote: "Finally, a platform that actually feels like it was built for real estate teams — not software engineers.",
    author: "Craig D.",
    role: "Auctioneer & Team Leader",
    initials: "CD",
  },
  {
    quote: "AgentBuddy replaced five different tools we were using. Now everything's in one place and so much easier.",
    author: "Sarah M.",
    role: "Principal Agent",
    initials: "SM",
  },
  {
    quote: "The AI coaching feature is like having a sales trainer available 24/7.",
    author: "Josh K.",
    role: "Sales Agent",
    initials: "JK",
  },
];

export const Testimonials = () => {
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
            Trusted by agents across NZ
          </h2>
          <p className="text-xl text-muted-foreground">
            See what real estate professionals are saying
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="p-6 h-full">
                <div className="flex flex-col h-full">
                  <p className="text-muted-foreground mb-6 flex-grow italic">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{testimonial.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
