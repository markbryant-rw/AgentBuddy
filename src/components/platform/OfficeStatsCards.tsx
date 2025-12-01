import { Users, Building2, TrendingUp, Trophy } from "lucide-react";
import { useOfficeData } from "@/hooks/useOfficeData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OfficeStatsCardsProps {
  officeId: string;
}

export const OfficeStatsCards = ({ officeId }: OfficeStatsCardsProps) => {
  const { data: officeData, isLoading } = useOfficeData(officeId);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalMembers = officeData?.totalMembers || 0;
  const totalTeams = officeData?.totalTeams || 0;

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <StatCard
        title="Team Members"
        value={totalMembers.toString()}
        icon={Users}
        description="Active team members"
      />
      <StatCard
        title="Active Teams"
        value={totalTeams.toString()}
        icon={Building2}
        description="Teams in this office"
      />
      <StatCard
        title="Total Listings"
        value="—"
        icon={TrendingUp}
        description="Coming soon"
      />
      <StatCard
        title="Performance"
        value="—"
        icon={Trophy}
        description="Coming soon"
      />
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
}

function StatCard({ title, value, icon: Icon, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}