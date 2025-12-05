import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Workspace-specific variants
        plan: "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
        prospect: "border-transparent bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
        transact: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        operate: "border-transparent bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
        grow: "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
        engage: "border-transparent bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
        // Status variants
        success: "border-transparent bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
        warning: "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        danger: "border-transparent bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
        info: "border-transparent bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
