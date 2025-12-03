import { Home, Key, TrendingUp, Users, Building, Handshake, FileText, Target } from 'lucide-react';

interface AnimatedAuthBackgroundProps {
  enabled?: boolean;
}

export const AnimatedAuthBackground = ({ enabled = true }: AnimatedAuthBackgroundProps) => {
  if (!enabled) return null;

  const icons = [
    { Icon: Home, delay: '0s', duration: '12s', size: 48 },
    { Icon: Key, delay: '1.5s', duration: '14s', size: 40 },
    { Icon: TrendingUp, delay: '3s', duration: '11s', size: 44 },
    { Icon: Users, delay: '4.5s', duration: '13s', size: 42 },
    { Icon: Building, delay: '6s', duration: '15s', size: 46 },
    { Icon: Handshake, delay: '7.5s', duration: '12.5s', size: 38 },
    { Icon: FileText, delay: '9s', duration: '14.5s', size: 40 },
    { Icon: Target, delay: '10.5s', duration: '13.5s', size: 44 },
  ];

  return (
    <div 
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Animated orbiting icons */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {icons.map(({ Icon, delay, duration, size }, index) => (
          <div
            key={`${delay}-${duration}-${size}`}
            className="absolute top-0 left-0 animate-orbit"
            style={{
              animationDelay: delay,
              animationDuration: duration,
              width: `${size}px`,
              height: `${size}px`,
            }}
          >
            <Icon
              className="w-full h-full text-primary/20 animate-float motion-reduce:animate-none"
              style={{
                animationDelay: delay,
                animationDuration: '3s',
                filter: 'blur(0.5px)',
              }}
            />
          </div>
        ))}
      </div>

      {/* Subtle pulsing circles for depth */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute w-[300px] h-[300px] rounded-full border border-primary/10 animate-pulse-slow" />
        <div 
          className="absolute w-[500px] h-[500px] rounded-full border border-primary/5 animate-pulse-slow"
          style={{ animationDelay: '1s' }}
        />
        <div 
          className="absolute w-[700px] h-[700px] rounded-full border border-primary/5 animate-pulse-slow"
          style={{ animationDelay: '2s' }}
        />
      </div>
    </div>
  );
};
