import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type MessagesHeaderVariant = "page" | "conversation" | "channel";

interface MessagesHeaderProps {
  variant?: MessagesHeaderVariant;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBackButton?: boolean;
  backLabel?: string;
  avatarUrl?: string | null;
  avatarFallback?: string;
  icon?: string;
  actions?: ReactNode;
  className?: string;
}

export function MessagesHeader({
  variant = "page",
  title,
  subtitle,
  onBack,
  showBackButton,
  backLabel,
  avatarUrl,
  avatarFallback,
  icon,
  actions,
  className,
}: MessagesHeaderProps) {
  const isPageVariant = variant === "page";
  
  return (
    <div
      className={cn(
        "border-b bg-card/90 backdrop-blur-md transition-all",
        isPageVariant ? "px-6 py-4" : "px-4 py-3",
        className
      )}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-3 min-w-0">
          {showBackButton && onBack && (
            <Button 
              variant="ghost" 
              onClick={onBack}
              className={cn(
                "shrink-0 gap-2 transition-all",
                backLabel ? "px-3" : "h-9 w-9 p-0"
              )}
            >
              <ArrowLeft className="h-5 w-5" />
              {backLabel && (
                <span className="hidden md:inline text-sm font-medium">
                  {backLabel}
                </span>
              )}
            </Button>
          )}

          {/* Avatar or Icon (for conversation/channel variants) */}
          {!isPageVariant && (
            <>
              {icon ? (
                <span className="text-3xl shrink-0">{icon}</span>
              ) : (avatarUrl !== undefined || avatarFallback) ? (
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarImage src={avatarUrl || undefined} />
                  <AvatarFallback>{avatarFallback || "?"}</AvatarFallback>
                </Avatar>
              ) : null}
            </>
          )}

          {/* Title & Subtitle */}
          <div className="min-w-0">
            <h1
              className={cn(
                "font-semibold truncate",
                isPageVariant ? "text-2xl" : "text-lg"
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Section - Actions */}
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
