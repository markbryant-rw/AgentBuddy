import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  calls: z.coerce.number().min(0, 'Must be 0 or greater'),
  sms: z.coerce.number().min(0, 'Must be 0 or greater'),
  appraisals: z.coerce.number().min(0, 'Must be 0 or greater'),
  openHomes: z.coerce.number().min(0, 'Must be 0 or greater'),
  listings: z.coerce.number().min(0, 'Must be 0 or greater'),
  sales: z.coerce.number().min(0, 'Must be 0 or greater'),
});

type FormValues = z.infer<typeof formSchema>;

interface AdjustTargetsDialogProps {
  currentGoals: {
    calls: number;
    sms: number;
    appraisals: number;
    openHomes: number;
    listings: number;
    sales: number;
  };
  onSave: (goals: FormValues) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AdjustTargetsDialog = ({ currentGoals, onSave, open, onOpenChange }: AdjustTargetsDialogProps) => {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: currentGoals,
  });

  const onSubmit = async (values: FormValues) => {
    setSaving(true);
    try {
      await onSave(values);
      toast({
        title: 'Targets updated',
        description: 'Your weekly pipeline targets have been saved.',
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update targets. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adjust Weekly Targets</DialogTitle>
          <DialogDescription>
            Set your weekly pipeline targets to track your progress and performance.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="calls"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Calls</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SMS</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="appraisals"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Appraisals</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="openHomes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Open Homes</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="listings"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Listings</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sales"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sales</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Targets'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
