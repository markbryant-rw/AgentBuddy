interface ProjectProgressBarProps {
  progress: number;
  className?: string;
}

export const ProjectProgressBar = ({ progress, className = '' }: ProjectProgressBarProps) => {
  return (
    <div className={`w-full h-2 bg-secondary/30 rounded-full overflow-hidden ${className}`}>
      <div
        className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
};
