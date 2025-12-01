import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import type { GenerateParams } from '@/hooks/useListingDescriptions';

const formSchema = z.object({
  address: z.string().min(5, 'Address must be at least 5 characters'),
  bedrooms: z.coerce.number().min(1).max(10),
  bathrooms: z.coerce.number().min(1).max(10),
  listingType: z.string().min(1, 'Please select a listing type'),
  targetAudience: z.string().min(1, 'Please select a target audience'),
  additionalFeatures: z.string().optional(),
});

interface DescriptionFormProps {
  onGenerate: (params: GenerateParams) => void;
  isGenerating: boolean;
  defaultValues?: Partial<GenerateParams>;
}

export const DescriptionForm = ({ onGenerate, isGenerating, defaultValues }: DescriptionFormProps) => {
  const form = useForm<GenerateParams>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      address: '',
      bedrooms: 3,
      bathrooms: 2,
      listingType: '',
      targetAudience: '',
      additionalFeatures: '',
    },
  });

  const onSubmit = (data: GenerateParams) => {
    onGenerate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Property Details
        </CardTitle>
        <CardDescription>
          Enter the property information to generate compelling descriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street, Suburb" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bedrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrooms</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="10" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bathrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bathrooms</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="10" step="0.5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="listingType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Listing Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select listing type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="For Sale">For Sale</SelectItem>
                      <SelectItem value="For Rent">For Rent</SelectItem>
                      <SelectItem value="For Lease">For Lease</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="targetAudience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Target Audience</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select target audience" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="First Home Buyers">First Home Buyers</SelectItem>
                      <SelectItem value="Young Families">Young Families</SelectItem>
                      <SelectItem value="Growing Families">Growing Families</SelectItem>
                      <SelectItem value="Investors">Investors</SelectItem>
                      <SelectItem value="Downsizers">Downsizers</SelectItem>
                      <SelectItem value="Professionals">Professionals</SelectItem>
                      <SelectItem value="Luxury Buyers">Luxury Buyers</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="additionalFeatures"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Features (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Pool, 2-car garage, 600m² land, mountain views, renovated kitchen..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Descriptions
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
