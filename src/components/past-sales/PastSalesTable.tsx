import { useState, useMemo, useCallback } from "react";
import { PastSale } from "@/hooks/usePastSales";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, MapPin, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PastSalesTableProps {
  pastSales: PastSale[];
  isLoading: boolean;
  onOpenDetail: (id: string) => void;
}

const PastSalesTable = ({ pastSales, isLoading, onOpenDetail }: PastSalesTableProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortField(null);
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField, sortDirection]);

  const getVendorName = (sale: PastSale) => {
    return `${sale.vendor_details?.primary?.first_name || ""} ${sale.vendor_details?.primary?.last_name || ""}`.trim();
  };

  const filteredSales = useMemo(() => {
    return pastSales.filter((sale) => {
      const searchLower = searchTerm.toLowerCase();
      const vendorName = getVendorName(sale);
      return (
        sale.address.toLowerCase().includes(searchLower) ||
        vendorName.toLowerCase().includes(searchLower) ||
        sale.status.toLowerCase().includes(searchLower) ||
        sale.lead_source?.toLowerCase().includes(searchLower)
      );
    });
  }, [pastSales, searchTerm]);

  const sortedAndFilteredSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => {
    if (!sortField) return 0;

    let aVal: any;
    let bVal: any;

    switch (sortField) {
      case 'address':
        aVal = a.address;
        bVal = b.address;
        break;
      case 'vendor':
        aVal = getVendorName(a);
        bVal = getVendorName(b);
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'price':
        aVal = a.sale_price || 0;
        bVal = b.sale_price || 0;
        break;
      case 'dom':
        aVal = a.days_on_market || 0;
        bVal = b.days_on_market || 0;
        break;
      case 'settlement':
        aVal = a.settlement_date ? new Date(a.settlement_date).getTime() : 0;
        bVal = b.settlement_date ? new Date(b.settlement_date).getTime() : 0;
        break;
      case 'lead_source':
        aVal = a.lead_source || '';
        bVal = b.lead_source || '';
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
    });
  }, [filteredSales, sortField, sortDirection]);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      won_and_sold: { variant: "default", label: "SOLD" },
      sold: { variant: "default", label: "SOLD" },
      withdrawn: { variant: "outline", label: "WITHDRAWN" },
    };
    const config = variants[status] || { variant: "outline", label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (value?: number) => {
    if (!value) return "-";
    return `$${(value / 1000).toFixed(0)}K`;
  };

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-NZ", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by address, suburb, or vendor name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <div 
                  onClick={() => handleSort('address')}
                  className="flex items-center gap-2 cursor-pointer hover:text-foreground select-none"
                >
                  <span>Address</span>
                  {sortField === 'address' ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead>
                <div 
                  onClick={() => handleSort('vendor')}
                  className="flex items-center gap-2 cursor-pointer hover:text-foreground select-none"
                >
                  <span>Vendor</span>
                  {sortField === 'vendor' ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead>
                <div 
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-2 cursor-pointer hover:text-foreground select-none"
                >
                  <span>Status</span>
                  {sortField === 'status' ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead>
                <div 
                  onClick={() => handleSort('price')}
                  className="flex items-center gap-2 cursor-pointer hover:text-foreground select-none"
                >
                  <span>Sale Price</span>
                  {sortField === 'price' ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead>
                <div 
                  onClick={() => handleSort('dom')}
                  className="flex items-center gap-2 cursor-pointer hover:text-foreground select-none"
                >
                  <span>DOM</span>
                  {sortField === 'dom' ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead>
                <div 
                  onClick={() => handleSort('settlement')}
                  className="flex items-center gap-2 cursor-pointer hover:text-foreground select-none"
                >
                  <span>Settlement</span>
                  {sortField === 'settlement' ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead>
                <div 
                  onClick={() => handleSort('lead_source')}
                  className="flex items-center gap-2 cursor-pointer hover:text-foreground select-none"
                >
                  <span>Lead Source</span>
                  {sortField === 'lead_source' ? (
                    sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                  )}
                </div>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAndFilteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No past sales found
                </TableCell>
              </TableRow>
            ) : (
              sortedAndFilteredSales.map((sale) => (
                <TableRow
                  key={sale.id}
                  className={cn(
                    "cursor-pointer hover:bg-muted/50",
                    sale.status === "withdrawn" && "bg-red-50/50 hover:bg-red-50/70 dark:bg-red-950/20 dark:hover:bg-red-950/30"
                  )}
                  onClick={() => onOpenDetail(sale.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {sale.latitude && sale.longitude && (
                        <MapPin className="h-4 w-4 text-green-600" />
                      )}
                      <div>
                        <div className="font-medium">{sale.address}</div>
                        {sale.suburb && (
                          <div className="text-sm text-muted-foreground">{sale.suburb}</div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {sale.vendor_details?.primary
                      ? `${sale.vendor_details.primary.first_name || ""} ${
                          sale.vendor_details.primary.last_name || ""
                        }`.trim() || "-"
                      : "-"}
                  </TableCell>
                  <TableCell>{getStatusBadge(sale.status)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(sale.sale_price)}
                  </TableCell>
                  <TableCell>
                    {sale.days_on_market ? `${sale.days_on_market} days` : "-"}
                  </TableCell>
                  <TableCell>{formatDate(sale.settlement_date)}</TableCell>
                  <TableCell>
                    <span className="text-sm">{sale.lead_source || "-"}</span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => onOpenDetail(sale.id)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PastSalesTable;