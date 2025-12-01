import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MessagesLayoutProps {
  header: ReactNode;
  sidebar?: ReactNode;
  main: ReactNode;
  className?: string;
}

export function MessagesLayout({ header, sidebar, main, className }: MessagesLayoutProps) {
  return (
    <div className={cn("flex flex-col h-full min-h-0", className)}>
      {/* Header */}
      {header}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar (Desktop only) */}
        {sidebar && (
          <div className="hidden md:flex w-80 border-r bg-card/50 backdrop-blur-sm overflow-hidden relative z-10 isolate" style={{ contain: 'layout style paint' }}>
            {sidebar}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative z-20">
          {main}
        </div>
      </div>
    </div>
  );
}
