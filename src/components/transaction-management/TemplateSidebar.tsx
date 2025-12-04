import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ListChecks, Files, ChevronRight } from 'lucide-react';
import { TransactionTask } from './TransactionTaskBuilder';

const SECTION_COLORS: Record<string, string> = {
  'GETTING STARTED': 'bg-blue-500',
  'MARKETING': 'bg-purple-500',
  'LEGAL': 'bg-red-500',
  'FINANCE': 'bg-green-500',
  'DUE DILIGENCE': 'bg-orange-500',
  'SETTLEMENT': 'bg-emerald-500',
  'HANDOVER': 'bg-teal-500',
  'CLIENT CARE': 'bg-pink-500',
  'ADMIN': 'bg-gray-500',
  'COMPLIANCE': 'bg-yellow-500',
  'STRATA': 'bg-indigo-500',
  'PLANNING': 'bg-cyan-500',
  'PRICING': 'bg-lime-500',
  'VIEWINGS': 'bg-rose-500',
  'PROSPECTING': 'bg-amber-500',
  'TRACKING': 'bg-violet-500',
  'PREPARATION': 'bg-fuchsia-500',
  'FOLLOW UP': 'bg-sky-500',
  'SCHEDULING': 'bg-slate-500',
  'SETUP': 'bg-stone-500',
  'COMMUNICATION': 'bg-zinc-500',
  'REPORTING': 'bg-neutral-500',
  'FINANCIAL': 'bg-emerald-600',
};

interface TemplateSidebarProps {
  sections: string[];
  tasksBySection: Record<string, TransactionTask[]>;
  activeSection: string | null;
  onSectionClick: (section: string) => void;
  documentsCount: number;
  totalTasks: number;
}

export function TemplateSidebar({
  sections,
  tasksBySection,
  activeSection,
  onSectionClick,
  documentsCount,
  totalTasks,
}: TemplateSidebarProps) {
  return (
    <div className="w-64 border-r bg-muted/30 flex flex-col">
      {/* Header Stats */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <ListChecks className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{totalTasks} Tasks</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Files className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{documentsCount} Documents</span>
        </div>
      </div>

      {/* Sections Navigation */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
            Sections
          </p>
          
          {sections.length === 0 ? (
            <p className="text-sm text-muted-foreground px-2 py-4">
              No sections yet. Add tasks to create sections.
            </p>
          ) : (
            sections.map((section) => {
              const tasks = tasksBySection[section] || [];
              const isActive = activeSection === section;
              
              return (
                <button
                  key={section}
                  onClick={() => onSectionClick(section)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors',
                    'hover:bg-accent/50',
                    isActive && 'bg-accent'
                  )}
                >
                  <div
                    className={cn(
                      'w-2.5 h-2.5 rounded-full flex-shrink-0',
                      SECTION_COLORS[section] || 'bg-gray-400'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{section}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs h-5 px-1.5">
                    {tasks.length}
                  </Badge>
                  {isActive && (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              );
            })
          )}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="p-4 border-t text-xs text-muted-foreground">
        <p>Click a section to jump to it</p>
      </div>
    </div>
  );
}
