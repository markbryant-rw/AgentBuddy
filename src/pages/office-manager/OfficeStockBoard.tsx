import { useState, useMemo } from 'react';
import { OfficePageHeader } from '@/components/office-manager/OfficePageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import { StockBoardTable } from '@/components/transaction-management/StockBoardTable';
import { TransactionDetailDrawer } from '@/components/transaction-management/TransactionDetailDrawer';
import { Transaction } from '@/hooks/useTransactions';
import { Loader2, Search } from 'lucide-react';

type GroupBy = 'none' | 'salesperson' | 'team';

export default function OfficeStockBoard() {
  const { activeOffice } = useOfficeSwitcher();
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['office-transactions', activeOffice?.id],
    queryFn: async () => {
      if (!activeOffice?.id) return [];

      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('agency_id', activeOffice.id);

      if (!teams) return [];

      const teamIds = teams.map(t => t.id);

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, team_id, created_by, last_edited_by,
          address, suburb, listing_id, client_name, client_email, client_phone,
          stage, warmth, on_hold, archived,
          vendor_names, buyer_names, vendor_phone, vendor_email,
          lead_source, campaign_type,
          sale_price, vendor_price, team_price, price_alignment_status,
          expected_settlement, contract_date, unconditional_date, settlement_date,
          live_date, auction_deadline_date, conditional_date,
          listing_signed_date, photoshoot_date, building_report_date, 
          listing_expires_date, pre_settlement_inspection_date,
          tasks_total, tasks_done, docs_total, docs_done,
          links, assignees, notes, attachments,
          latitude, longitude, geocoded_at, geocode_error,
          deal_history,
          created_at, updated_at
        `)
        .in('team_id', teamIds)
        .eq('archived', false)
        .order('expected_settlement', { ascending: true, nullsFirst: false });

      if (error) throw error;

      // Enrich with team names
      return (data || []).map(t => ({
        ...t,
        team_name: teams.find(team => team.id === t.team_id)?.name || 'Unknown Team'
      })) as any[];
    },
    enabled: !!activeOffice?.id,
    staleTime: 2 * 60 * 1000,
  });

  const filteredTransactions = useMemo(() => {
    if (!searchQuery) return transactions;
    
    const query = searchQuery.toLowerCase();
    return transactions.filter(t => 
      t.address?.toLowerCase().includes(query) ||
      t.client_name?.toLowerCase().includes(query) ||
      t.suburb?.toLowerCase().includes(query)
    );
  }, [transactions, searchQuery]);

  const groupedTransactions = useMemo(() => {
    if (groupBy === 'none') {
      return [{ key: 'all', label: 'All Listings', transactions: filteredTransactions }];
    }

    const groups = new Map<string, (Transaction & { team_name: string })[]>();

    filteredTransactions.forEach(t => {
      let key = '';
      let label = '';

      if (groupBy === 'team') {
        key = t.team_id;
        label = (t as any).team_name || 'Unknown Team';
      } else if (groupBy === 'salesperson') {
        const leadSalesperson = t.assignees?.lead_salesperson;
        if (leadSalesperson) {
          key = leadSalesperson;
          label = 'Salesperson'; // We'd need to fetch names, for now use ID
        } else {
          key = 'unassigned';
          label = 'Unassigned';
        }
      }

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(t as Transaction & { team_name: string });
    });

    return Array.from(groups.entries()).map(([key, transactions]) => ({
      key,
      label: groupBy === 'team' ? transactions[0]?.team_name || key : key,
      transactions,
    }));
  }, [filteredTransactions, groupBy]);

  return (
    <div className="min-h-screen bg-background">
      <OfficePageHeader
        title="Stock Board"
        description={`Office-wide view of all active listings${activeOffice ? ` in ${activeOffice.name}` : ''}`}
      />

      <div className="container mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle>All Active Listings</CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search address, client..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-[250px]"
                  />
                </div>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Group by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Grouping</SelectItem>
                    <SelectItem value="team">Group by Team</SelectItem>
                    <SelectItem value="salesperson">Group by Salesperson</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-8">
                {groupedTransactions.map(group => (
                  <div key={group.key}>
                    {groupBy !== 'none' && (
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        {group.label}
                        <span className="text-sm font-normal text-muted-foreground">
                          ({group.transactions.length} listings)
                        </span>
                      </h3>
                    )}
                    <StockBoardTable
                      transactions={group.transactions}
                      onView={(t) => setSelectedTransaction(t)}
                      onEdit={(t) => setSelectedTransaction(t)}
                    />
                  </div>
                ))}
                
                {filteredTransactions.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>No listings found</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedTransaction && (
        <TransactionDetailDrawer
          transaction={selectedTransaction}
          open={!!selectedTransaction}
          onOpenChange={(open) => !open && setSelectedTransaction(null)}
        />
      )}
    </div>
  );
}
