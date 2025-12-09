/**
 * Modal Framework - Standardized z-index and behavior for all dialogs
 * 
 * Z-Index Hierarchy (CORRECT ORDER - DO NOT OVERRIDE):
 * - Select/Popover/Dropdown Portals: z-[12000] (HIGHEST - always on top)
 * - Alert Dialogs: z-[11000] (overlay), z-[11001] (content)
 * - Base Dialogs: z-[9998] (overlay), z-[9999] (content)
 * - Navigation: z-[100]
 * 
 * IMPORTANT: Never add inline z-index overrides to SelectContent, PopoverContent,
 * or DropdownMenuContent components. The base components already have the correct
 * z-index (z-[12000]) to render above all dialogs. Adding inline overrides like
 * className="z-[10001]" will cause dropdowns to appear BEHIND dialog overlays.
 * 
 * Usage:
 * - Use StandardDialog for main content dialogs
 * - Use StandardAlertDialog for confirmations, warnings, and critical prompts
 * - These components enforce consistent backdrop blur, animations, and z-index
 */

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// ============================================================================
// STANDARD DIALOG (Main Content Dialogs)
// ============================================================================

const StandardDialog = DialogPrimitive.Root;
const StandardDialogTrigger = DialogPrimitive.Trigger;
const StandardDialogPortal = DialogPrimitive.Portal;
const StandardDialogClose = DialogPrimitive.Close;

const StandardDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[9998] bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
));
StandardDialogOverlay.displayName = "StandardDialogOverlay";

const StandardDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <StandardDialogPortal>
    <StandardDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-[9999] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </StandardDialogPortal>
));
StandardDialogContent.displayName = "StandardDialogContent";

const StandardDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
StandardDialogHeader.displayName = "StandardDialogHeader";

const StandardDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
StandardDialogFooter.displayName = "StandardDialogFooter";

const StandardDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
));
StandardDialogTitle.displayName = "StandardDialogTitle";

const StandardDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
StandardDialogDescription.displayName = "StandardDialogDescription";

// ============================================================================
// STANDARD ALERT DIALOG (Confirmations, Warnings, Critical Prompts)
// ============================================================================

const StandardAlertDialog = AlertDialogPrimitive.Root;
const StandardAlertDialogTrigger = AlertDialogPrimitive.Trigger;
const StandardAlertDialogPortal = AlertDialogPrimitive.Portal;

const StandardAlertDialogOverlay = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-[11000] bg-black/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
));
StandardAlertDialogOverlay.displayName = "StandardAlertDialogOverlay";

const StandardAlertDialogContent = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Content>
>(({ className, ...props }, ref) => (
  <StandardAlertDialogPortal>
    <StandardAlertDialogOverlay />
    <AlertDialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-[11001] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    />
  </StandardAlertDialogPortal>
));
StandardAlertDialogContent.displayName = "StandardAlertDialogContent";

const StandardAlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
StandardAlertDialogHeader.displayName = "StandardAlertDialogHeader";

const StandardAlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
StandardAlertDialogFooter.displayName = "StandardAlertDialogFooter";

const StandardAlertDialogTitle = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold", className)}
    {...props}
  />
));
StandardAlertDialogTitle.displayName = "StandardAlertDialogTitle";

const StandardAlertDialogDescription = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
));
StandardAlertDialogDescription.displayName = "StandardAlertDialogDescription";

const StandardAlertDialogAction = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Action>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Action>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Action
    ref={ref}
    className={cn(buttonVariants(), className)}
    {...props}
  />
));
StandardAlertDialogAction.displayName = "StandardAlertDialogAction";

const StandardAlertDialogCancel = React.forwardRef<
  React.ElementRef<typeof AlertDialogPrimitive.Cancel>,
  React.ComponentPropsWithoutRef<typeof AlertDialogPrimitive.Cancel>
>(({ className, ...props }, ref) => (
  <AlertDialogPrimitive.Cancel
    ref={ref}
    className={cn(
      buttonVariants({ variant: "outline" }),
      "mt-2 sm:mt-0",
      className
    )}
    {...props}
  />
));
StandardAlertDialogCancel.displayName = "StandardAlertDialogCancel";

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Standard Dialog (Main Content)
  StandardDialog,
  StandardDialogTrigger,
  StandardDialogContent,
  StandardDialogHeader,
  StandardDialogFooter,
  StandardDialogTitle,
  StandardDialogDescription,
  StandardDialogClose,
  
  // Standard Alert Dialog (Confirmations/Warnings)
  StandardAlertDialog,
  StandardAlertDialogTrigger,
  StandardAlertDialogContent,
  StandardAlertDialogHeader,
  StandardAlertDialogFooter,
  StandardAlertDialogTitle,
  StandardAlertDialogDescription,
  StandardAlertDialogAction,
  StandardAlertDialogCancel,
};
