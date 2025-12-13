import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PastSale, usePastSales } from "@/hooks/usePastSales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { useTeam } from "@/hooks/useTeam";
import { useToast } from "@/hooks/use-toast";
import { useLeadSources } from "@/hooks/useLeadSources";
import { formatCurrencyFull, parseCurrency } from "@/lib/currencyUtils";
import { Trash2, Heart, Plus } from "lucide-react";
import LocationFixSection from "@/components/shared/LocationFixSection";
import { AftercarePlanTab } from "./AftercarePlanTab";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PastSaleDetailDialogProps {
  pastSale?: PastSale;
  isOpen: boolean;
  onClose: () => void;
}

const WITHDRAWAL_REASONS = [
  { value: 'decided_not_to_sell', label: 'Decided not to sell' },
  { value: 'price_expectations', label: 'Price expectations too high' },
  { value: 'personal_circumstances', label: 'Personal circumstances changed' },
  { value: 'another_agent', label: 'Going with another agent' },
  { value: 'market_conditions', label: 'Market conditions' },
  { value: 'property_not_ready', label: 'Property not ready' },
  { value: 'finance_issues', label: 'Finance issues' },
  { value: 'alternative_solution', label: 'Found alternative solution' },
  { value: 'other', label: 'Other' },
];

const PastSaleDetailDialog = ({ pastSale, isOpen, onClose }: PastSaleDetailDialogProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { team } = useTeam();
  const { toast } = useToast();
  const { addPastSale, updatePastSale, deletePastSale } = usePastSales(team?.id);
  const { activeLeadSources } = useLeadSources();
  const [isLoading, setIsLoading] = useState(false);
  const [salePriceDisplay, setSalePriceDisplay] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingOpportunity, setIsAddingOpportunity] = useState(false);

  const [formData, setFormData] = useState<Partial<PastSale>>({
    address: "",
    suburb: "",
    status: "won_and_sold",
  });

  useEffect(() => {
    if (pastSale) {
      setFormData(pastSale);
      setSalePriceDisplay(pastSale.sale_price ? formatCurrencyFull(pastSale.sale_price) : "");
    } else {
      setFormData({
        address: "",
        suburb: "",
        status: "won_and_sold",
      });
      setSalePriceDisplay("");
    }
  }, [pastSale, isOpen]);

  const handleSave = async () => {
    try {
      setIsLoading(true);

      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      if (!formData.address) {
        throw new Error("Address is required");
      }

      if (pastSale) {
        await updatePastSale({ id: pastSale.id, updates: formData });
      } else {
        // Get team_id from team context
        if (!team?.id) {
          throw new Error("You must be assigned to a team to add past sales");
        }

        await addPastSale({
          ...formData,
          team_id: team.id,
          created_by: user.id,
        });
      }

      onClose();
    } catch (error) {
      console.error("Error saving past sale:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save past sale",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!pastSale?.id) return;
    setIsDeleting(true);
    try {
      await deletePastSale(pastSale.id);
      toast({
        title: "Success",
        description: "Past sale deleted successfully",
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete past sale. You may need admin permissions.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLocationUpdated = (data: { address: string; suburb: string; latitude: number; longitude: number }) => {
    // Update local form data with new coordinates
    setFormData(prev => ({
      ...prev,
      address: data.address,
      suburb: data.suburb,
      latitude: data.latitude,
      longitude: data.longitude,
      geocode_error: null,
      geocoded_at: new Date().toISOString(),
    }));
    // Invalidate cache to refresh map and list views
    queryClient.invalidateQueries({ queryKey: ['past_sales', team?.id] });
  };

  const handleAddAsOpportunity = async () => {
    if (!pastSale || !team?.id || !user?.id) return;
    
    setIsAddingOpportunity(true);
    try {
      const vendorName = [
        formData.vendor_details?.primary?.first_name,
        formData.vendor_details?.primary?.last_name
      ].filter(Boolean).join(' ');

      const withdrawalNote = formData.withdrawal_reason 
        ? `Re-added from withdrawn past sale (${formData.withdrawn_date || 'date unknown'} - ${WITHDRAWAL_REASONS.find(r => r.value === formData.withdrawal_reason)?.label || formData.withdrawal_reason})`
        : 'Re-added from withdrawn past sale';

      const { error } = await supabase.from('listings_pipeline').insert({
        address: formData.address || '',
        suburb: formData.suburb,
        vendor_name: vendorName || null,
        team_id: team.id,
        created_by: user.id,
        stage: 'call',
        warmth: 'warm',
        notes: withdrawalNote,
        latitude: formData.latitude,
        longitude: formData.longitude,
        lead_source: formData.lead_source,
      });

      if (error) throw error;

      toast({
        title: "Opportunity Created",
        description: `${formData.address} has been added to your pipeline`,
      });

      // Invalidate pipeline queries
      queryClient.invalidateQueries({ queryKey: ['listings_pipeline'] });
      
      onClose();
      navigate('/opportunities');
    } catch (error) {
      console.error('Error creating opportunity:', error);
      toast({
        title: "Error",
        description: "Failed to create opportunity",
        variant: "destructive",
      });
    } finally {
      setIsAddingOpportunity(false);
    }
  };

  const isWithdrawn = formData.status === 'withdrawn';

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{pastSale ? "Edit Past Sale" : "Add Past Sale"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="property" className="w-full">
          <TabsList className={`grid w-full ${isWithdrawn ? (pastSale ? 'grid-cols-3' : 'grid-cols-2') : (pastSale ? 'grid-cols-4' : 'grid-cols-3')}`}>
            <TabsTrigger value="property">Property</TabsTrigger>
            <TabsTrigger value="vendor">Vendor</TabsTrigger>
            {!isWithdrawn && (
              <TabsTrigger value="buyer">Buyer</TabsTrigger>
            )}
            {pastSale && (
              <TabsTrigger value="aftercare" className="flex items-center gap-1">
                <Heart className="h-3 w-3" />
                Aftercare
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="property" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address">Address *</Label>
                <Input
                  id="address"
                  value={formData.address || ""}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Smith St"
                />
              </div>
              <div>
                <Label htmlFor="suburb">Suburb</Label>
                <Input
                  id="suburb"
                  value={formData.suburb || ""}
                  onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                  placeholder="Oratia"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="won_and_sold">SOLD</SelectItem>
                  <SelectItem value="withdrawn">WITHDRAWN</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional fields based on status */}
            {isWithdrawn ? (
              <>
                {/* Withdrawn-specific fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="withdrawn_date">Withdrawn Date</Label>
                    <Input
                      id="withdrawn_date"
                      type="date"
                      value={formData.withdrawn_date || ""}
                      onChange={(e) => setFormData({ ...formData, withdrawn_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lead_source">Lead Source</Label>
                    <Select
                      value={formData.lead_source}
                      onValueChange={(value) => setFormData({ ...formData, lead_source: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activeLeadSources.map((source) => (
                          <SelectItem key={source.id} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="withdrawal_reason">Reason for Withdrawal</Label>
                  <Select
                    value={formData.withdrawal_reason || ""}
                    onValueChange={(value) => setFormData({ ...formData, withdrawal_reason: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      {WITHDRAWAL_REASONS.map((reason) => (
                        <SelectItem key={reason.value} value={reason.value}>
                          {reason.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.withdrawal_reason === 'other' && (
                  <div>
                    <Label htmlFor="notes">Withdrawal Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes || ""}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional details about why the listing was withdrawn..."
                      rows={3}
                    />
                  </div>
                )}

                <div>
                  <Label htmlFor="days_on_market">Days Listed</Label>
                  <Input
                    id="days_on_market"
                    type="number"
                    value={formData.days_on_market || ""}
                    onChange={(e) => setFormData({ ...formData, days_on_market: parseInt(e.target.value) })}
                    placeholder="Number of days the property was listed"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Sold-specific fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="sale_price">Sale Price</Label>
                    <Input
                      id="sale_price"
                      value={salePriceDisplay}
                      onChange={(e) => {
                        setSalePriceDisplay(e.target.value);
                        const parsed = parseCurrency(e.target.value);
                        setFormData({ ...formData, sale_price: parsed });
                      }}
                      onBlur={() => {
                        if (formData.sale_price) {
                          setSalePriceDisplay(formatCurrencyFull(formData.sale_price));
                        }
                      }}
                      placeholder="$1,200,000"
                    />
                  </div>
                  <div>
                    <Label htmlFor="settlement_date">Settlement Date</Label>
                    <Input
                      id="settlement_date"
                      type="date"
                      value={formData.settlement_date || ""}
                      onChange={(e) => setFormData({ ...formData, settlement_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="days_on_market">Days on Market</Label>
                    <Input
                      id="days_on_market"
                      type="number"
                      value={formData.days_on_market || ""}
                      onChange={(e) => setFormData({ ...formData, days_on_market: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="lead_source">Lead Source</Label>
                    <Select
                      value={formData.lead_source}
                      onValueChange={(value) => setFormData({ ...formData, lead_source: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activeLeadSources.map((source) => (
                          <SelectItem key={source.id} value={source.value}>
                            {source.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Fix Location Section - only show for existing past sales */}
            {pastSale && (
              <LocationFixSection
                entityId={pastSale.id}
                entityType="past-sale"
                address={formData.address || ''}
                suburb={formData.suburb || undefined}
                latitude={formData.latitude}
                longitude={formData.longitude}
                geocodeError={formData.geocode_error}
                geocodedAt={formData.geocoded_at}
                onLocationUpdated={handleLocationUpdated}
              />
            )}
          </TabsContent>

          <TabsContent value="vendor" className="space-y-4 mt-4">
            <div>
              <Label>Primary Vendor</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <Input
                  placeholder="First Name"
                  value={formData.vendor_details?.primary?.first_name || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vendor_details: {
                        ...formData.vendor_details,
                        primary: {
                          ...formData.vendor_details?.primary,
                          first_name: e.target.value,
                        },
                      },
                    })
                  }
                />
                <Input
                  placeholder="Last Name"
                  value={formData.vendor_details?.primary?.last_name || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vendor_details: {
                        ...formData.vendor_details,
                        primary: {
                          ...formData.vendor_details?.primary,
                          last_name: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.vendor_details?.primary?.email || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vendor_details: {
                        ...formData.vendor_details,
                        primary: {
                          ...formData.vendor_details?.primary,
                          email: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  placeholder="021 123 4567"
                  value={formData.vendor_details?.primary?.phone || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      vendor_details: {
                        ...formData.vendor_details,
                        primary: {
                          ...formData.vendor_details?.primary,
                          phone: e.target.value,
                        },
                      },
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Where They Moved To</Label>
              <Input
                placeholder="12 Beach Road, Torbay"
                value={formData.vendor_details?.primary?.moved_to || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vendor_details: {
                      ...formData.vendor_details,
                      primary: {
                        ...formData.vendor_details?.primary,
                        moved_to: e.target.value,
                      },
                    },
                  })
                }
              />
            </div>

            <div>
              <Label>Relationship Notes</Label>
              <Textarea
                placeholder="Kids names, pets, interests, etc."
                value={formData.vendor_details?.primary?.relationship_notes || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    vendor_details: {
                      ...formData.vendor_details,
                      primary: {
                        ...formData.vendor_details?.primary,
                        relationship_notes: e.target.value,
                      },
                    },
                  })
                }
                rows={4}
              />
            </div>

            {/* Referral Partner Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="vendor_referral"
                  checked={formData.vendor_details?.primary?.is_referral_partner || false}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      vendor_details: {
                        ...formData.vendor_details,
                        primary: {
                          ...formData.vendor_details?.primary,
                          is_referral_partner: checked as boolean,
                        },
                      },
                    })
                  }
                />
                <Label htmlFor="vendor_referral" className="font-semibold cursor-pointer">
                  This vendor is a referral partner
                </Label>
              </div>

              {formData.vendor_details?.primary?.is_referral_partner && (
                <div className="space-y-4 ml-6">
                  <div>
                    <Label>Referral Potential</Label>
                    <Select
                      value={formData.vendor_details?.primary?.referral_potential || "medium"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          vendor_details: {
                            ...formData.vendor_details,
                            primary: {
                              ...formData.vendor_details?.primary,
                              referral_potential: value,
                            },
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Last Contacted</Label>
                      <Input
                        type="date"
                        value={formData.vendor_details?.primary?.last_contacted_date || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vendor_details: {
                              ...formData.vendor_details,
                              primary: {
                                ...formData.vendor_details?.primary,
                                last_contacted_date: e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Next Follow-up</Label>
                      <Input
                        type="date"
                        value={formData.vendor_details?.primary?.next_followup_date || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vendor_details: {
                              ...formData.vendor_details,
                              primary: {
                                ...formData.vendor_details?.primary,
                                next_followup_date: e.target.value,
                              },
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Estimated Referral Value</Label>
                    <Input
                      type="number"
                      placeholder="Based on appraisal value"
                      value={formData.vendor_details?.primary?.referral_value || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vendor_details: {
                            ...formData.vendor_details,
                            primary: {
                              ...formData.vendor_details?.primary,
                              referral_value: parseFloat(e.target.value) || undefined,
                            },
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Referral Notes</Label>
                    <Textarea
                      placeholder="Notes about referral potential..."
                      value={formData.vendor_details?.primary?.referral_notes || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          vendor_details: {
                            ...formData.vendor_details,
                            primary: {
                              ...formData.vendor_details?.primary,
                              referral_notes: e.target.value,
                            },
                          },
                        })
                      }
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="buyer" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input
                  placeholder="First Name"
                  value={formData.buyer_details?.first_name || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      buyer_details: {
                        ...formData.buyer_details,
                        first_name: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  placeholder="Last Name"
                  value={formData.buyer_details?.last_name || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      buyer_details: {
                        ...formData.buyer_details,
                        last_name: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@example.com"
                  value={formData.buyer_details?.email || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      buyer_details: {
                        ...formData.buyer_details,
                        email: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  placeholder="021 123 4567"
                  value={formData.buyer_details?.phone || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      buyer_details: {
                        ...formData.buyer_details,
                        phone: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Relationship Notes</Label>
              <Textarea
                placeholder="Kids names, pets, interests, etc."
                value={formData.buyer_details?.relationship_notes || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    buyer_details: {
                      ...formData.buyer_details,
                      relationship_notes: e.target.value,
                    },
                  })
                }
                rows={4}
              />
            </div>

            {/* Referral Partner Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center space-x-2 mb-4">
                <Checkbox
                  id="buyer_referral"
                  checked={formData.buyer_details?.is_referral_partner || false}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      buyer_details: {
                        ...formData.buyer_details,
                        is_referral_partner: checked as boolean,
                      },
                    })
                  }
                />
                <Label htmlFor="buyer_referral" className="font-semibold cursor-pointer">
                  This buyer is a referral partner
                </Label>
              </div>

              {formData.buyer_details?.is_referral_partner && (
                <div className="space-y-4 ml-6">
                  <div>
                    <Label>Referral Potential</Label>
                    <Select
                      value={formData.buyer_details?.referral_potential || "medium"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          buyer_details: {
                            ...formData.buyer_details,
                            referral_potential: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Last Contacted</Label>
                      <Input
                        type="date"
                        value={formData.buyer_details?.last_contacted_date || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            buyer_details: {
                              ...formData.buyer_details,
                              last_contacted_date: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>Next Follow-up</Label>
                      <Input
                        type="date"
                        value={formData.buyer_details?.next_followup_date || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            buyer_details: {
                              ...formData.buyer_details,
                              next_followup_date: e.target.value,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Estimated Referral Value</Label>
                    <Input
                      type="number"
                      placeholder="Based on appraisal value"
                      value={formData.buyer_details?.referral_value || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          buyer_details: {
                            ...formData.buyer_details,
                            referral_value: parseFloat(e.target.value) || undefined,
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label>Referral Notes</Label>
                    <Textarea
                      placeholder="Notes about referral potential..."
                      value={formData.buyer_details?.referral_notes || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          buyer_details: {
                            ...formData.buyer_details,
                            referral_notes: e.target.value,
                          },
                        })
                      }
                      rows={3}
                    />
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Aftercare plan & tasks */}
          {/* Only available for existing past sales */}
          {pastSale && (
            <TabsContent value="aftercare" className="mt-4">
              <AftercarePlanTab pastSale={pastSale} />
            </TabsContent>
          )}
        </Tabs>

        <div className="flex justify-between gap-2 mt-6">
          <div className="flex gap-2">
            {pastSale?.id && (
              <Button
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isLoading || isDeleting || isAddingOpportunity}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
            {/* Add as Opportunity button - only for withdrawn sales */}
            {pastSale && isWithdrawn && (
              <Button
                variant="outline"
                onClick={handleAddAsOpportunity}
                disabled={isLoading || isDeleting || isAddingOpportunity}
                className="text-teal-600 border-teal-300 hover:bg-teal-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAddingOpportunity ? "Adding..." : "Add as Opportunity"}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading || isDeleting || isAddingOpportunity}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isLoading || isDeleting || isAddingOpportunity}>
              {isLoading ? "Saving..." : pastSale ? "Update" : "Add Past Sale"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <AlertDialogContent className="z-[11001]">
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Past Sale</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this past sale. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
};

export default PastSaleDetailDialog;