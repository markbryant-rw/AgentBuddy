interface PomodoroProgressRingProps {
  sessionCount: number;
  isRunning: boolean;
}

export const PomodoroProgressRing = ({ sessionCount, isRunning }: PomodoroProgressRingProps) => {
  const progress = sessionCount % 4;
  const segments = 4;
  const segmentAngle = 360 / segments;
  
  return (
    <svg
      className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
      viewBox="0 0 40 40"
    >
      {Array.from({ length: segments }, (_, i) => {
        const isFilled = i < progress;
        const startAngle = i * segmentAngle;
        const endAngle = startAngle + segmentAngle - 8; // 8 degree gap
        
        return (
          <path
            key={i}
            d={describeArc(20, 20, 18, startAngle, endAngle)}
            fill="none"
            stroke={isFilled ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
            strokeWidth="2.5"
            strokeLinecap="round"
            className={isFilled && isRunning ? 'animate-pulse' : ''}
          />
        );
      })}
    </svg>
  );
};

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}
