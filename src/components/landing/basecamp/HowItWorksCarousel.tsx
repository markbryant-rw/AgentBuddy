import { BarChart3, CheckSquare, Building2, MessageSquare, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const modules = [
  {
    title: "KPI Tracker",
    description: "Measure what matters — track deals, conversions, and goals in real-time.",
    icon: BarChart3,
    color: "from-blue-500/20 to-cyan-500/20"
  },
  {
    title: "Task Manager",
    description: "Assign, track, and complete — never let a deal fall through the cracks.",
    icon: CheckSquare,
    color: "from-green-500/20 to-emerald-500/20"
  },
  {
    title: "Listing Pipeline",
    description: "See every campaign stage — from appraisal to sold.",
    icon: Building2,
    color: "from-purple-500/20 to-pink-500/20"
  },
  {
    title: "Messaging & Notes",
    description: "Communicate and collaborate — all in context.",
    icon: MessageSquare,
    color: "from-orange-500/20 to-red-500/20"
  },
  {
    title: "Vendor Reporting",
    description: "AI-powered updates in one click — professional and on-brand.",
    icon: FileText,
    color: "from-indigo-500/20 to-violet-500/20"
  }
];

export const HowItWorksCarousel = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-4xl md:text-5xl font-bold">How it works</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Everything your team needs, working together seamlessly.
          </p>
        </motion.div>

        <Carousel className="max-w-5xl mx-auto">
          <CarouselContent>
            {modules.map((module, index) => {
              const Icon = module.icon;
              return (
                <CarouselItem key={module.title} className="md:basis-1/2 lg:basis-1/3">
                  <Card className="h-full border-2 hover:shadow-xl transition-all duration-300">
                    <CardContent className="p-6 space-y-4">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${module.color} flex items-center justify-center`}>
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-2xl font-bold">{module.title}</h3>
                      <p className="text-muted-foreground leading-relaxed">
                        {module.description}
                      </p>
                    </CardContent>
                  </Card>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>

        <div className="text-center mt-12">
          <Link to="/feedback-centre?tab=features">
            <Button variant="outline" size="lg">
              Explore the platform →
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};
