import { useState } from 'react';
import { DatePill } from './pills/DatePill';
import { AssigneePill } from './pills/AssigneePill';
import { TagsPill } from './pills/TagsPill';
import { UrgencyPill } from './pills/UrgencyPill';
import { cn } from '@/lib/utils';

interface TaskPropertyPillsProps {
  task: any;
  className?: string;
  compact?: boolean;
}

export const TaskPropertyPills = ({ task, className, compact = false }: TaskPropertyPillsProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 ml-auto",
        "transition-all duration-200",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => e.stopPropagation()}
    >
      <AssigneePill task={task} showAlways={!compact} isHovered={isHovered} />
      <DatePill task={task} showAlways={!compact} isHovered={isHovered} />
      <TagsPill task={task} showAlways={!compact} isHovered={isHovered} />
      <UrgencyPill task={task} showAlways={!compact} isHovered={isHovered} />
    </div>
  );
};
