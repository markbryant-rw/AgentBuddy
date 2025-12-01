import { motion } from 'framer-motion';
import { TrendingUp, Target, Flame, ArrowRight, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaceMetrics } from '@/lib/paceCalculations';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HeroMetricsProps {
  weeklyCCH: number;
  weeklyCCHTarget: number;
  quarterlyAppraisals: number;
  quarterlyAppraisalsTarget: number;
  highAppraisals: number;
  mediumAppraisals: number;
  lowAppraisals: number;
  monthlyPace: number;
  paceMetrics: PaceMetrics | null;
  breakdown: {
    calls: number;
    appraisals: number;
    openHomes: number;
  };
}

export const HeroMetrics = ({
  weeklyCCH,
  weeklyCCHTarget,
  quarterlyAppraisals,
  quarterlyAppraisalsTarget,
  highAppraisals,
  mediumAppraisals,
  lowAppraisals,
  monthlyPace,
  paceMetrics,
  breakdown,
}: HeroMetricsProps) => {
  const navigate = useNavigate();
  const [flippedCard, setFlippedCard] = useState<'cch' | 'appraisals' | null>(null);
  const [cchInfo, setCchInfo] = useState<string>('');
  const [appraisalsInfo, setAppraisalsInfo] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const cchProgress = Math.min((weeklyCCH / weeklyCCHTarget) * 100, 100);
  const appraisalsProgress = Math.min((quarterlyAppraisals / quarterlyAppraisalsTarget) * 100, 100);
  
  const cchStatus = paceMetrics?.status || 'behind';
  const appraisalsStatus = quarterlyAppraisals >= quarterlyAppraisalsTarget ? 'exceeded' : quarterlyAppraisals >= quarterlyAppraisalsTarget * 0.7 ? 'ontrack' : 'behind';
  const appraisalsToGo = Math.max(0, quarterlyAppraisalsTarget - quarterlyAppraisals);

  const fetchMetricInfo = async (metricType: 'cch' | 'appraisals') => {
    const cached = localStorage.getItem(`metric_info_${metricType}`);
    if (cached) {
      return cached;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-metric-info', {
        body: { metricType }
      });

      if (error) throw error;

      const content = data.content;
      localStorage.setItem(`metric_info_${metricType}`, content);
      return content;
    } catch (error) {
      console.error('Error fetching metric info:', error);
      toast.error('Failed to load information');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleFlip = async (cardType: 'cch' | 'appraisals') => {
    if (flippedCard === cardType) {
      setFlippedCard(null);
      return;
    }

    if (cardType === 'cch' && !cchInfo) {
      const content = await fetchMetricInfo('cch');
      if (content) setCchInfo(content);
    } else if (cardType === 'appraisals' && !appraisalsInfo) {
      const content = await fetchMetricInfo('appraisals');
      if (content) setAppraisalsInfo(content);
    }

    setFlippedCard(cardType);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* CCH This Week */}
      <div 
        className="relative"
        style={{ perspective: '1000px', minHeight: '320px' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            rotateY: flippedCard === 'cch' ? 180 : 0
          }}
          transition={{ 
            opacity: { duration: 0.4 },
            y: { duration: 0.4 },
            rotateY: { duration: 0.6 }
          }}
          style={{
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
            position: 'relative',
            minHeight: '320px'
          }}
          className="cursor-pointer"
          onClick={() => flippedCard !== 'cch' && setFlippedCard('cch')}
        >
          {/* Front face */}
          <div 
            className={cn(
              "relative p-8 rounded-2xl shadow-xl absolute inset-0",
              flippedCard === 'cch' && "invisible"
            )}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: 'linear-gradient(135deg, hsl(220, 30%, 45%) 0%, hsl(220, 35%, 35%) 100%)',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFlip('cch');
              }}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-20"
              aria-label="Learn more about CCH"
            >
              <Info className="h-5 w-5 text-white" />
            </button>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-5 w-5 text-white/80" />
                <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide">CCH This Week</h3>
              </div>
              
              <div className="flex items-baseline gap-3 mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: 'spring' }}
                  className="text-6xl font-bold text-white"
                >
                  {weeklyCCH.toFixed(1)}
                </motion.div>
                <div className="text-2xl text-white/60">/ {weeklyCCHTarget.toFixed(1)} hrs</div>
              </div>

              <div className="relative h-3 bg-white/20 rounded-full overflow-hidden mb-6">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${cchProgress}%` }}
                  transition={{ delay: 0.3, duration: 0.8, ease: 'easeOut' }}
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full',
                    cchStatus === 'ahead' && 'bg-gradient-to-r from-green-400 to-green-500',
                    cchStatus === 'ontrack' && 'bg-gradient-to-r from-blue-400 to-blue-500',
                    cchStatus === 'behind' && 'bg-gradient-to-r from-amber-400 to-amber-500'
                  )}
                  style={{
                    boxShadow: '0 0 20px rgba(255, 255, 255, 0.4)',
                  }}
                />
              </div>

              <div className="space-y-2 text-sm text-white/80">
                <div className="flex justify-between">
                  <span>{breakdown.calls} calls</span>
                  <span>{(breakdown.calls / 20).toFixed(1)} CCH</span>
                </div>
                <div className="flex justify-between">
                  <span>{breakdown.appraisals} appraisals</span>
                  <span>{breakdown.appraisals.toFixed(1)} CCH</span>
                </div>
                <div className="flex justify-between">
                  <span>{breakdown.openHomes} open homes</span>
                  <span>{(breakdown.openHomes / 2).toFixed(1)} CCH</span>
                </div>
              </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          </div>

          {/* Back face */}
          <div
            className={cn(
              "rounded-2xl shadow-xl p-8 absolute inset-0",
              flippedCard !== 'cch' && "invisible"
            )}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'white',
              border: '4px solid hsl(220, 30%, 45%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full flex flex-col justify-center items-center text-center px-4">
              <Info className="h-12 w-12 mb-4" style={{ color: 'hsl(220, 30%, 45%)' }} />
              <h4 className="text-xl font-bold text-gray-900 mb-4">CCH Breakdown & Targets</h4>
              <div className="text-gray-700 text-base leading-relaxed max-w-md space-y-3">
                <p className="font-medium">Placeholder: Understanding Your CCH</p>
                <p>Your weekly target helps you stay on track. Each activity contributes different hours toward your goal.</p>
                <p className="text-sm text-gray-600">Calls • Appraisals • Open Homes</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFlippedCard(null);
                }}
                className="mt-6 px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                style={{ 
                  backgroundColor: 'hsl(220, 30%, 95%)',
                  color: 'hsl(220, 30%, 45%)'
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Appraisals This Quarter */}
      <div 
        className="relative"
        style={{ perspective: '1000px', minHeight: '320px' }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            rotateY: flippedCard === 'appraisals' ? 180 : 0
          }}
          transition={{ 
            opacity: { duration: 0.4, delay: 0.1 },
            y: { duration: 0.4, delay: 0.1 },
            rotateY: { duration: 0.6 }
          }}
          style={{
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
            position: 'relative',
            minHeight: '320px'
          }}
          className="cursor-pointer"
          onClick={() => flippedCard !== 'appraisals' && setFlippedCard('appraisals')}
        >
          {/* Front face */}
          <div 
            className={cn(
              "relative p-8 rounded-2xl shadow-xl absolute inset-0",
              flippedCard === 'appraisals' && "invisible"
            )}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: 'linear-gradient(135deg, hsl(280, 40%, 55%) 0%, hsl(280, 45%, 45%) 100%)',
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFlip('appraisals');
              }}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors z-20"
              aria-label="Learn more about appraisals"
            >
              <Info className="h-5 w-5 text-white" />
            </button>

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-white/80" />
                <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide">Appraisals This Quarter</h3>
              </div>
              
              <div className="flex items-baseline gap-3 mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  className="text-6xl font-bold text-white"
                >
                  {quarterlyAppraisals}
                </motion.div>
                <div className="text-2xl text-white/60">/ {quarterlyAppraisalsTarget} goal</div>
              </div>

              <div className="relative h-3 bg-white/20 rounded-full overflow-hidden mb-6">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${appraisalsProgress}%` }}
                  transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full',
                    appraisalsStatus === 'exceeded' && 'bg-gradient-to-r from-green-400 to-green-500',
                    appraisalsStatus === 'ontrack' && 'bg-gradient-to-r from-blue-400 to-blue-500',
                    appraisalsStatus === 'behind' && 'bg-gradient-to-r from-amber-400 to-amber-500'
                  )}
                  style={{
                    boxShadow: '0 0 20px rgba(255, 255, 255, 0.4)',
                  }}
                />
              </div>

              <div className="space-y-2 text-sm text-white/80">
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="h-4 w-4 text-red-300" />
                    <span>High Intent</span>
                  </div>
                  <span className="font-semibold">{highAppraisals}</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-orange-300" />
                    <span>Medium Intent</span>
                  </div>
                  <span className="font-semibold">{mediumAppraisals}</span>
                </div>
                <div className="flex justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-blue-300" />
                    <span>Low Intent</span>
                  </div>
                  <span className="font-semibold">{lowAppraisals}</span>
                </div>
              </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          </div>

          {/* Back face */}
          <div
            className={cn(
              "rounded-2xl shadow-xl p-8 absolute inset-0",
              flippedCard !== 'appraisals' && "invisible"
            )}
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'white',
              border: '4px solid hsl(280, 40%, 55%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full flex flex-col justify-center items-center text-center px-4">
              <Target className="h-12 w-12 mb-4" style={{ color: 'hsl(280, 40%, 55%)' }} />
              <h4 className="text-xl font-bold text-gray-900 mb-4">Quarterly Appraisal Goals</h4>
              <div className="text-gray-700 text-base leading-relaxed max-w-md space-y-3">
                <p className="font-medium">Placeholder: Tracking Your Progress</p>
                <p>Your quarterly target keeps you focused on building your pipeline. Monitor warmth levels to prioritize follow-ups.</p>
                <p className="text-sm text-gray-600">Hot • Warm • Cold</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFlippedCard(null);
                }}
                className="mt-6 px-6 py-2 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                style={{ 
                  backgroundColor: 'hsl(280, 40%, 95%)',
                  color: 'hsl(280, 40%, 55%)'
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
