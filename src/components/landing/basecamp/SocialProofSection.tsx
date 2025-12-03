import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote: "We used to spend hours every week just figuring out who was doing what. Now it's all in one place.",
    author: "Sarah Mitchell",
    role: "Team Leader",
    company: "Ray White Brisbane",
    initials: "SM",
    stat: "40% faster task completion"
  },
  {
    quote: "Finally, a system that understands how real estate teams actually work. Game changer.",
    author: "James Chen",
    role: "Principal Agent",
    company: "Harcourts Gold Coast",
    initials: "JC",
    stat: "12 hours saved per week"
  },
  {
    quote: "Our VAs love it. Our agents love it. Even our admin loves it. That's rare.",
    author: "Emma Rodriguez",
    role: "Operations Manager",
    company: "LJ Hooker Sydney",
    initials: "ER",
    stat: "100% team adoption in 2 weeks"
  }
];

export const SocialProofSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Real teams. Real results.</h2>
          <p className="text-xl text-muted-foreground">
            Trusted by hundreds of agents across Australia
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-6 space-y-6">
                  <Quote className="h-8 w-8 text-primary/40" />
                  
                  <p className="text-lg leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {testimonial.initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{testimonial.author}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.company}</p>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium text-primary">{testimonial.stat}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
