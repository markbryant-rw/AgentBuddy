interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  hidePercentage?: boolean;
  hideBackgroundRing?: boolean;
}

export const ProgressRing = ({ 
  progress, 
  size = 40, 
  strokeWidth = 4,
  className = "",
  hidePercentage = false,
  hideBackgroundRing = false
}: ProgressRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference;
  
  // Color based on progress (like Apple Fitness rings)
  const getColor = () => {
    if (progress >= 100) return 'hsl(var(--chart-2))'; // Green when complete
    if (progress >= 80) return 'hsl(var(--chart-3))'; // Yellow-green
    if (progress >= 50) return 'hsl(var(--chart-4))'; // Orange
    return 'hsl(var(--chart-1))'; // Red for low progress
  };

  return (
    <svg
      width={size}
      height={size}
      className={className}
    >
      {/* Background ring */}
      {!hideBackgroundRing && (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          opacity={0.2}
        />
      )}
      {/* Progress ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={getColor()}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{
          transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease',
        }}
      />
      {/* Center text showing percentage */}
      {!hidePercentage && (
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dy="0.3em"
          fontSize={size * 0.25}
          fill="currentColor"
          fontWeight="600"
        >
          {Math.round(progress)}%
        </text>
      )}
    </svg>
  );
};
