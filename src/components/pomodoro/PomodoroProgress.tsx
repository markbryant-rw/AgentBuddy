interface PomodoroProgressProps {
  sessionCount: number;
}

export const PomodoroProgress = ({ sessionCount }: PomodoroProgressProps) => {
  const progress = sessionCount % 4;
  const tomatoes = Array.from({ length: 4 }, (_, i) => (
    <span key={i} className="text-lg">
      {i < progress ? '🍅' : '○'}
    </span>
  ));

  return (
    <div className="flex items-center gap-1">
      {tomatoes}
      <span className="text-xs text-muted-foreground ml-1">
        ({progress}/4)
      </span>
    </div>
  );
};
