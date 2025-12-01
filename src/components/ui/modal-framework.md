# Modal Framework Documentation

## Overview

This framework provides standardized z-index hierarchy and consistent behavior for all dialogs and confirmations across the application.

## Z-Index Hierarchy

```
Layer 1: Base Dialogs (StandardDialog)
  - Overlay: z-[9998]
  - Content: z-[9999]
  - Use for: Main content dialogs, forms, detail views

Layer 2: Select Dropdowns (within dialogs)
  - Content: z-[10001]
  - Use for: Dropdowns inside dialog content

Layer 3: Alert Dialogs (StandardAlertDialog)
  - Overlay: z-[11000]
  - Content: z-[11001]
  - Use for: Confirmations, warnings, critical prompts

Layer 4: Toasts
  - Container: z-[12000]
  - Use for: Notifications, success/error messages
```

## Components

### StandardDialog

Use for main content dialogs (forms, detail views, etc.)

```tsx
import {
  StandardDialog,
  StandardDialogTrigger,
  StandardDialogContent,
  StandardDialogHeader,
  StandardDialogTitle,
  StandardDialogDescription,
  StandardDialogFooter,
} from "@/components/ui/modal-framework";

<StandardDialog open={open} onOpenChange={setOpen}>
  <StandardDialogContent>
    <StandardDialogHeader>
      <StandardDialogTitle>Edit Profile</StandardDialogTitle>
      <StandardDialogDescription>
        Make changes to your profile here.
      </StandardDialogDescription>
    </StandardDialogHeader>
    
    {/* Your form content */}
    
    <StandardDialogFooter>
      <Button onClick={handleSave}>Save</Button>
    </StandardDialogFooter>
  </StandardDialogContent>
</StandardDialog>
```

### StandardAlertDialog

Use for confirmations, warnings, and critical prompts

```tsx
import {
  StandardAlertDialog,
  StandardAlertDialogContent,
  StandardAlertDialogHeader,
  StandardAlertDialogTitle,
  StandardAlertDialogDescription,
  StandardAlertDialogFooter,
  StandardAlertDialogAction,
  StandardAlertDialogCancel,
} from "@/components/ui/modal-framework";

<StandardAlertDialog open={open} onOpenChange={setOpen}>
  <StandardAlertDialogContent>
    <StandardAlertDialogHeader>
      <StandardAlertDialogTitle>Are you sure?</StandardAlertDialogTitle>
      <StandardAlertDialogDescription>
        This action cannot be undone.
      </StandardAlertDialogDescription>
    </StandardAlertDialogHeader>
    <StandardAlertDialogFooter>
      <StandardAlertDialogCancel>Cancel</StandardAlertDialogCancel>
      <StandardAlertDialogAction onClick={handleConfirm}>
        Continue
      </StandardAlertDialogAction>
    </StandardAlertDialogFooter>
  </StandardAlertDialogContent>
</StandardAlertDialog>
```

## Best Practices

### 1. No Nested Dialogs

❌ **Don't:**
```tsx
<StandardDialog>
  <StandardAlertDialog>
    {/* Nested alert inside dialog */}
  </StandardAlertDialog>
</StandardDialog>
```

✅ **Do:**
```tsx
// Close first dialog, then open second
const handleAction = () => {
  setMainDialogOpen(false);
  setConfirmDialogOpen(true);
};
```

### 2. State Management

Always reset internal state when dialogs close:

```tsx
const handleDialogOpenChange = (open: boolean) => {
  if (!open) {
    // Reset all internal state
    setFormData(initialState);
    setErrors({});
    setWarnings(null);
  }
  onOpenChange(open);
};
```

### 3. Defensive UX

Disable actions while confirmations are pending:

```tsx
<Button
  disabled={isSubmitting || confirmationOpen}
  onClick={handleSubmit}
>
  Submit
</Button>
```

### 4. Consistent Styling

The framework provides:
- Backdrop blur on overlays
- Smooth animations (fade, zoom, slide)
- Consistent spacing and typography
- Accessibility features built-in

### 5. Select Dropdowns in Dialogs

When using Select components inside dialogs, ensure they use the correct z-index:

```tsx
<Select>
  <SelectTrigger>...</SelectTrigger>
  <SelectContent className="z-[10001]">
    {/* Content */}
  </SelectContent>
</Select>
```

## Migration Guide

### From Old Dialog:

```tsx
// Before
import { Dialog, DialogContent } from "@/components/ui/dialog";

<Dialog>
  <DialogContent className="z-[10000]">
    {/* Don't use custom z-index overrides! */}
  </DialogContent>
</Dialog>

// After
import { StandardDialog, StandardDialogContent } from "@/components/ui/modal-framework";

<StandardDialog>
  <StandardDialogContent>
    {/* Framework handles z-index automatically */}
  </StandardDialogContent>
</StandardDialog>
```

### From Old AlertDialog:

```tsx
// Before
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";

// After
import { StandardAlertDialog, StandardAlertDialogContent } from "@/components/ui/modal-framework";
```

## Troubleshooting

### Issue: Alert appears behind dialog

**Solution:** Verify you're using `StandardAlertDialog` (not `AlertDialog`). The framework ensures alerts always appear above standard dialogs.

### Issue: Select dropdown hidden

**Solution:** Add `className="z-[10001]"` to `SelectContent` within dialogs.

### Issue: App seems to "hang"

**Solution:** Check if an alert is open but hidden. Use browser dev tools to inspect z-index layers. Ensure no custom z-index overrides conflict with the framework.

## Future Enhancements

- [ ] Auto-detect and warn about z-index conflicts in dev mode
- [ ] Inline warning components (alternative to nested alerts)
- [ ] Modal history/stack for complex flows
- [ ] Keyboard shortcuts (Esc to close, etc.)
