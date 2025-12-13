import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export interface VendorDetails {
  primary?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    children?: string[];
    pets?: string[];
    moved_to?: string;
    moved_date?: string;
    relationship_notes?: string;
    is_referral_partner?: boolean;
    referral_value?: number;
    referral_notes?: string;
    referral_potential?: string;
    last_contacted_date?: string;
    next_followup_date?: string;
  };
  secondary?: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    children?: string[];
    pets?: string[];
    relationship_notes?: string;
  };
}

export interface BuyerDetails {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  children?: string[];
  pets?: string[];
  moving_from?: string;
  relationship_notes?: string;
  is_referral_partner?: boolean;
  referral_value?: number;
  referral_notes?: string;
  referral_potential?: string;
  last_contacted_date?: string;
  next_followup_date?: string;
}

// Interface aligned with actual database schema
export interface PastSale {
  id: string;
  team_id: string;
  address: string;
  suburb?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  geocoded_at?: string;
  geocode_error?: string;
  status: string;
  lost_reason?: string;
  lost_date?: string;
  appraisal_low?: number;
  appraisal_high?: number;
  listing_price?: number;
  sale_price?: number;
  sale_date?: string;
  commission_rate?: number;
  commission?: number;
  settlement_date?: string;
  first_contact_date?: string;
  appraisal_date?: string;
  listing_signed_date?: string;
  listing_live_date?: string;
  unconditional_date?: string;
  days_on_market?: number;
  lead_source?: string;
  lead_source_detail?: string;
  vendor_details?: VendorDetails;
  buyer_details?: BuyerDetails;
  agent_id?: string;
  bedrooms?: number;
  bathrooms?: number;
  property_type?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Aftercare fields
  aftercare_template_id?: string;
  aftercare_started_at?: string;
  aftercare_status?: 'pending' | 'active' | 'paused' | 'completed';
}

export const usePastSales = (teamId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Fetch all past sales for the specified team (or user's teams if no teamId specified)
  const { data: pastSales = [], isLoading, refetch } = useQuery({
    queryKey: ["pastSales", teamId || user?.id],
    queryFn: async () => {
      let query = supabase
        .from("past_sales")
        .select("*");
      
      // Filter by team_id if provided
      if (teamId) {
        query = query.eq('team_id', teamId);
      }
      
      const { data, error } = await query
        .order("listing_live_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(d => ({
        ...d,
        status: d.status || 'settled',
        created_by: d.created_by || '',
        updated_at: d.updated_at || d.created_at,
      })) as PastSale[];
    },
    enabled: !!user,
  });

  // Add past sale
  const addPastSale = useMutation({
    mutationFn: async (newPastSale: Partial<PastSale>) => {
      const insertData = {
        ...newPastSale,
        vendor_details: newPastSale.vendor_details || {},
        buyer_details: newPastSale.buyer_details || {},
      };
      
      const { data, error } = await supabase
        .from("past_sales")
        .insert([insertData as any])
        .select()
        .single();

      if (error) throw error;

      // Trigger geocoding if address provided and check result
      let geocodingFailed = false;
      let geocodeErrorMessage = '';
      
      if (data.address) {
        try {
          const { data: geocodeResult, error: geocodeError } = await supabase.functions.invoke("geocode-past-sale", {
            body: { pastSaleId: data.id },
          });
          
          if (geocodeError) {
            geocodingFailed = true;
            geocodeErrorMessage = geocodeError.message || 'Geocoding service unavailable';
          } else if (geocodeResult && geocodeResult.success === false) {
            geocodingFailed = true;
            geocodeErrorMessage = geocodeResult.message || geocodeResult.error || 'Address could not be geocoded';
          }
        } catch (err) {
          console.error("Geocoding error:", err);
          geocodingFailed = true;
          geocodeErrorMessage = 'Geocoding service error';
        }
      }

      return { ...data, geocodingFailed, geocodeErrorMessage };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["pastSales"] });
      
      if (result.geocodingFailed) {
        toast({
          title: "Past sale saved - Location warning",
          description: `The address could not be geocoded: ${result.geocodeErrorMessage}. Use 'Fix Location' to manually set coordinates.`,
          variant: "destructive",
          duration: 8000,
        });
      } else {
        toast({
          title: "Success",
          description: "Past sale added successfully",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update past sale
  const updatePastSale = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PastSale> }) => {
      const updateData = {
        ...updates,
        vendor_details: updates.vendor_details || undefined,
        buyer_details: updates.buyer_details || undefined,
      };
      
      const { data, error } = await supabase
        .from("past_sales")
        .update(updateData as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Trigger geocoding if address or suburb changed and check result
      let geocodingFailed = false;
      let geocodeErrorMessage = '';
      
      if (updates.address || updates.suburb) {
        try {
          const { data: geocodeResult, error: geocodeError } = await supabase.functions.invoke("geocode-past-sale", {
            body: { pastSaleId: id },
          });
          
          if (geocodeError) {
            geocodingFailed = true;
            geocodeErrorMessage = geocodeError.message || 'Geocoding service unavailable';
          } else if (geocodeResult && geocodeResult.success === false) {
            geocodingFailed = true;
            geocodeErrorMessage = geocodeResult.message || geocodeResult.error || 'Address could not be geocoded';
          }
        } catch (err) {
          console.error("Geocoding error:", err);
          geocodingFailed = true;
          geocodeErrorMessage = 'Geocoding service error';
        }
      }

      return { ...data, geocodingFailed, geocodeErrorMessage };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["pastSales"] });
      
      if (result.geocodingFailed) {
        toast({
          title: "Past sale saved - Location warning",
          description: `The address could not be geocoded: ${result.geocodeErrorMessage}. Use 'Fix Location' to manually set coordinates.`,
          variant: "destructive",
          duration: 8000,
        });
      } else {
        toast({
          title: "Success",
          description: "Past sale updated successfully",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete past sale
  const deletePastSale = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("past_sales")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pastSales"] });
      toast({
        title: "Success",
        description: "Past sale deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Geocode single past sale
  const geocodePastSale = useMutation({
    mutationFn: async (pastSaleId: string) => {
      const { data, error } = await supabase.functions.invoke("geocode-past-sale", {
        body: { pastSaleId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pastSales"] });
      toast({
        title: "Success",
        description: "Geocoding completed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Geocoding Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Geocode all past sales without coordinates
  const geocodeAllPastSales = useMutation({
    mutationFn: async () => {
      const ungeocodedSales = pastSales.filter(
        (sale) => sale.address && !sale.latitude && !sale.longitude
      );

      const results = await Promise.allSettled(
        ungeocodedSales.map((sale) =>
          supabase.functions.invoke("geocode-past-sale", {
            body: { pastSaleId: sale.id },
          })
        )
      );

      const successful = results.filter((r) => r.status === "fulfilled").length;
      const failed = results.filter((r) => r.status === "rejected").length;

      return { successful, failed, total: ungeocodedSales.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["pastSales"] });
      toast({
        title: "Geocoding Complete",
        description: `${result.successful} of ${result.total} past sales geocoded successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove duplicate past sales (same address + settlement_date)
  const removeDuplicates = useMutation({
    mutationFn: async () => {
      // Group by address + settlement_date, keeping the oldest record
      const duplicateGroups = new Map<string, PastSale[]>();
      
      pastSales.forEach(sale => {
        const key = `${(sale.address || '').toLowerCase().trim()}|${sale.settlement_date || ''}`;
        if (!duplicateGroups.has(key)) {
          duplicateGroups.set(key, []);
        }
        duplicateGroups.get(key)!.push(sale);
      });

      const idsToDelete: string[] = [];
      duplicateGroups.forEach(group => {
        if (group.length > 1) {
          // Sort by created_at, keep the oldest (first created)
          group.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          // Delete all except the first one
          group.slice(1).forEach(sale => idsToDelete.push(sale.id));
        }
      });

      if (idsToDelete.length === 0) {
        return { deleted: 0 };
      }

      const { error } = await supabase
        .from('past_sales')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;
      return { deleted: idsToDelete.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["pastSales"] });
      toast({
        title: "Duplicates Removed",
        description: result.deleted > 0 
          ? `Removed ${result.deleted} duplicate record${result.deleted > 1 ? 's' : ''}`
          : "No duplicates found",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    pastSales,
    isLoading,
    refetch,
    addPastSale: addPastSale.mutateAsync,
    updatePastSale: updatePastSale.mutateAsync,
    deletePastSale: deletePastSale.mutateAsync,
    geocodePastSale: geocodePastSale.mutateAsync,
    geocodeAllPastSales: geocodeAllPastSales.mutateAsync,
    removeDuplicates: removeDuplicates.mutateAsync,
    isRemovingDuplicates: removeDuplicates.isPending,
  };
};
