import { useState, useMemo } from 'react';
import { OfficePageHeader } from '@/components/office-manager/OfficePageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOfficeSwitcher } from '@/hooks/useOfficeSwitcher';
import { Loader2, Search, Calendar, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

type GroupBy = 'none' | 'team' | 'salesperson';

export default function OfficeAppraisals() {
  const { activeOffice } = useOfficeSwitcher();
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');

  const { data: appraisals = [], isLoading } = useQuery({
    queryKey: ['office-appraisals', activeOffice?.id],
    queryFn: async () => {
      if (!activeOffice?.id) return [];
      const { data: teams } = await supabase.from('teams').select('id, name').eq('agency_id', activeOffice.id).eq('is_archived', false);
      if (!teams) return [];
      const teamIds = teams.map(t => t.id);
      const { data, error } = await supabase.from('logged_appraisals').select('id, address, suburb, vendor_name, appraisal_date, estimated_value, intent, status, team_id, created_by').in('team_id', teamIds).order('appraisal_date', { ascending: false });
      if (error) throw error;
      const userIds = [...new Set(data?.map(a => a.created_by) || [])];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', userIds);
      return (data || []).map(a => ({
        ...a,
        team_name: teams.find(t => t.id === a.team_id)?.name || 'Unknown Team',
        created_by_name: profiles?.find(p => p.id === a.created_by)?.full_name || 'Unknown',
      }));
    },
    enabled: !!activeOffice?.id,
  });

  const filteredAppraisals = useMemo(() => {
    if (!searchQuery) return appraisals;
    const query = searchQuery.toLowerCase();
    return appraisals.filter(a => 
      a.address?.toLowerCase().includes(query) ||
      a.vendor_name?.toLowerCase().includes(query) ||
      a.suburb?.toLowerCase().includes(query)
    );
  }, [appraisals, searchQuery]);

  const getIntentColor = (intent: string) => {
    switch (intent) {
      case 'high': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'low': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return '';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <OfficePageHeader title="Office Appraisals" description="View and analyze all appraisals across your office" />
      <div className="flex-1 overflow-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by address, vendor, or suburb..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </div>
          </CardHeader>
        </Card>

        {isLoading ? (
          <Card><CardContent className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredAppraisals.map(appraisal => (
                  <div key={appraisal.id} className="p-4 hover:bg-muted/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold">{appraisal.address}</h3>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span><Calendar className="h-3 w-3 inline mr-1" />{format(new Date(appraisal.appraisal_date), 'dd MMM yyyy')}</span>
                          <span className="font-medium">{appraisal.vendor_name}</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={getIntentColor(appraisal.intent)}>{appraisal.intent}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
