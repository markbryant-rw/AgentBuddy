import { motion } from "framer-motion";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    quote: "Finally, a tool that gets how real estate actually works. My team adopted it in a week.",
    author: "Sarah Mitchell",
    role: "Principal, Ray White",
    avatar: "SM",
    rating: 5,
  },
  {
    quote: "The appraisal tracking alone has helped me win 3 more listings this quarter. The follow-ups are automatic.",
    author: "Marcus Chen",
    role: "Senior Sales Agent",
    avatar: "MC",
    rating: 5,
  },
  {
    quote: "I can see exactly what my team is working on without the weekly check-in meetings. It's a game changer.",
    author: "Jennifer Park",
    role: "Office Manager",
    avatar: "JP",
    rating: 5,
  },
];

const stats = [
  { value: "15,000+", label: "Appraisals tracked" },
  { value: "98%", label: "Team adoption rate" },
  { value: "12hrs", label: "Saved per week" },
  { value: "4.9/5", label: "User rating" },
];

const brandLogos = [
  { name: "Ray White", initial: "RW", color: "bg-yellow-500" },
  { name: "LJ Hooker", initial: "LJ", color: "bg-red-500" },
  { name: "Harcourts", initial: "H", color: "bg-blue-600" },
  { name: "Century 21", initial: "21", color: "bg-amber-600" },
  { name: "First National", initial: "FN", color: "bg-green-600" },
];

export const SocialProofNew = () => {
  return (
    <section className="py-24 bg-muted/30">
      <div className="container mx-auto px-4">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Trusted by agents who close deals
          </h2>
          <p className="text-lg text-muted-foreground">
            Join thousands of real estate professionals who've upgraded their workflow
          </p>
        </motion.div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="relative"
            >
              <div className="bg-background rounded-2xl border border-border p-6 h-full">
                {/* Quote icon */}
                <Quote className="h-8 w-8 text-teal-500/20 mb-4" />
                
                {/* Rating */}
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center text-white font-medium text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-medium">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Brand logos */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center items-center gap-6"
        >
          <span className="text-sm text-muted-foreground">Trusted by teams at</span>
          {brandLogos.map((brand, index) => (
            <motion.div
              key={brand.name}
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background border border-border"
            >
              <div className={`w-6 h-6 rounded ${brand.color} flex items-center justify-center text-white text-xs font-bold`}>
                {brand.initial}
              </div>
              <span className="text-sm font-medium">{brand.name}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
