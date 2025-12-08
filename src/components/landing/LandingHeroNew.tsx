import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Sparkles, Shield, Gamepad2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { queryClient } from "@/lib/queryClient";

const floatingWorkspaces = [
  { name: "Plan", emoji: "📋", gradient: "from-blue-500 to-indigo-600", delay: 0 },
  { name: "Prospect", emoji: "🎯", gradient: "from-teal-500 to-cyan-500", delay: 0.1 },
  { name: "Transact", emoji: "💰", gradient: "from-amber-500 to-orange-500", delay: 0.2 },
  { name: "Operate", emoji: "⚙️", gradient: "from-purple-500 to-violet-600", delay: 0.3 },
  { name: "Grow", emoji: "📈", gradient: "from-emerald-500 to-green-500", delay: 0.4 },
  { name: "Engage", emoji: "💬", gradient: "from-pink-500 to-rose-500", delay: 0.5 },
];

const trustBadges = [
  { icon: Sparkles, text: "Works with your existing CRM" },
  { icon: Shield, text: "Built for NZ real estate" },
];

export const LandingHeroNew = () => {
  const navigate = useNavigate();
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleTryDemo = async () => {
    setIsDemoLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('demo-login');
      
      if (error) throw error;
      
      if (data?.success && data?.session) {
        // Set the session from the response
        await supabase.auth.setSession({
          access_token: data.session.session.access_token,
          refresh_token: data.session.session.refresh_token,
        });
        
        // Invalidate all cached queries to ensure fresh data after demo login
        await queryClient.invalidateQueries({ queryKey: ['user-profile'] });
        await queryClient.invalidateQueries({ queryKey: ['team'] });
        await queryClient.invalidateQueries({ queryKey: ['user-roles'] });
        
        // Wait for auth state to stabilize and roles to load before navigating
        await new Promise(resolve => setTimeout(resolve, 500));
        
        toast.success("Welcome to Demo Mode! Explore freely - everything resets at midnight NZT.");
        navigate('/dashboard');
      } else {
        throw new Error(data?.error || 'Failed to start demo');
      }
    } catch (error: unknown) {
      console.error('Demo login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start demo';
      toast.error(errorMessage);
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-20">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-muted/50" />
      
      {/* Floating gradient orbs */}
      <motion.div
        className="absolute top-20 left-10 w-96 h-96 bg-gradient-to-r from-teal-500/20 to-cyan-500/20 rounded-full blur-3xl"
        animate={{ 
          x: [0, 50, 0], 
          y: [0, 30, 0],
          scale: [1, 1.1, 1] 
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 right-10 w-80 h-80 bg-gradient-to-r from-purple-500/20 to-violet-500/20 rounded-full blur-3xl"
        animate={{ 
          x: [0, -40, 0], 
          y: [0, -20, 0],
          scale: [1, 1.15, 1] 
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/2 left-1/3 w-64 h-64 bg-gradient-to-r from-amber-500/15 to-orange-500/15 rounded-full blur-3xl"
        animate={{ 
          x: [0, 30, 0], 
          y: [0, -40, 0],
          scale: [1, 1.2, 1] 
        }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium text-primary mb-6"
            >
              <Sparkles className="h-4 w-4" />
              <span>For agents who want more from their day</span>
            </motion.div>

            {/* Main headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6"
            >
              Give your real estate business{" "}
              <span className="bg-gradient-to-r from-teal-500 via-cyan-500 to-blue-500 bg-clip-text text-transparent">
                superpowers
              </span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0"
            >
              AgentBuddy sits alongside your CRM, adding AI assistance, team coordination, 
              and transaction tracking — without replacing anything you already use.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8"
            >
              <Button 
                size="lg" 
                onClick={handleTryDemo}
                disabled={isDemoLoading}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/25 px-8 py-6 text-lg group"
              >
                {isDemoLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Starting Demo...
                  </>
                ) : (
                  <>
                    <Gamepad2 className="mr-2 h-5 w-5" />
                    Try Demo
                  </>
                )}
              </Button>
              <Link to="/auth?tab=signup">
                <Button size="lg" variant="outline" className="border-2 px-8 py-6 text-lg group">
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-4 justify-center lg:justify-start"
            >
              {trustBadges.map((badge, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <badge.icon className="h-4 w-4 text-primary" />
                  <span>{badge.text}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right side - Floating workspace cards */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="relative h-[400px] lg:h-[500px] hidden md:block"
          >
            {/* Central glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 bg-gradient-to-r from-teal-500/30 to-purple-500/30 rounded-full blur-3xl" />
            </div>

            {/* Floating workspace cards in orbital arrangement */}
            {floatingWorkspaces.map((workspace, index) => {
              const angle = (index * 60) * (Math.PI / 180);
              const radius = 140;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;

              return (
                <motion.div
                  key={workspace.name}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    x: x,
                    y: y,
                  }}
                  transition={{ 
                    delay: 0.6 + workspace.delay,
                    duration: 0.5,
                    type: "spring",
                    stiffness: 100
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <motion.div
                    animate={{ 
                      y: [0, -8, 0],
                      rotate: [0, 2, 0, -2, 0]
                    }}
                    transition={{ 
                      duration: 4 + index * 0.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: index * 0.3
                    }}
                    className={`
                      flex flex-col items-center gap-2 px-5 py-4 rounded-2xl
                      bg-background/80 backdrop-blur-xl border border-border/50
                      shadow-xl shadow-black/10
                      cursor-default hover:scale-105 transition-transform
                    `}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${workspace.gradient} flex items-center justify-center text-xl`}>
                      {workspace.emoji}
                    </div>
                    <span className="text-sm font-semibold">{workspace.name}</span>
                  </motion.div>
                </motion.div>
              );
            })}

            {/* Center AgentBuddy logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-teal-500/30">
                <span className="text-3xl">🏠</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-muted/50 to-transparent" />
    </section>
  );
};
