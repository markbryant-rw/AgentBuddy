import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

const fallbackQuotes = [
  "Every call is a chance to change someone's life. Make it count! Your consistency today builds the foundation for tomorrow's success.",
  "Success in real estate comes to those who show up consistently. Build relationships, not just transactions, and watch your pipeline flourish.",
  "Your warmest leads today are tomorrow's listings. The difference between ordinary and extraordinary is that little extra effort you put in every day.",
  "Don't wait for opportunity. Create it with every interaction. Your pipeline is a reflection of your daily habits and commitment to excellence.",
  "Great agents don't wait for opportunities, they create them. Consistency beats perfection. Show up every day with purpose and passion.",
];

export const MotivationalQuote = () => {
  const [quote, setQuote] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadQuote = async () => {
      // Check cache first
      const cachedQuote = localStorage.getItem('dailyQuote');
      const cacheDate = localStorage.getItem('quoteDate');
      const today = new Date().toDateString();

      if (cachedQuote && cacheDate === today) {
        setQuote(cachedQuote);
        setLoading(false);
        return;
      }

      // Generate new quote using Lovable AI
      try {
        logger.info('Generating new daily quote...');
        const { data, error } = await supabase.functions.invoke('generate-daily-quote');
        
        if (error) {
          logger.error('Error generating quote:', error);
          throw error;
        }

        const newQuote = data.quote;
        logger.info('Generated quote:', { quote: newQuote });
        
        setQuote(newQuote);
        localStorage.setItem('dailyQuote', newQuote);
        localStorage.setItem('quoteDate', today);
      } catch (error) {
        logger.error('Failed to generate quote, using fallback:', error);
        // Use a random fallback quote
        const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        setQuote(randomQuote);
      } finally {
        setLoading(false);
      }
    };

    loadQuote();
  }, []);

  if (loading) {
    return (
      <p className="text-base text-muted-foreground italic animate-pulse max-w-2xl">
        Loading inspiration...
      </p>
    );
  }

  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="text-base text-muted-foreground italic max-w-2xl leading-relaxed"
    >
      {quote}
    </motion.p>
  );
};
