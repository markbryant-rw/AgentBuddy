import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, Users, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MostViewed {
  id: string;
  title: string;
  unique_viewers: number;
  total_views: number;
  avg_time_spent: number;
}

interface MostViewedTableProps {
  data: MostViewed[] | undefined;
}

export function MostViewedTable({ data }: MostViewedTableProps) {
  const navigate = useNavigate();

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Most Viewed Playbooks</CardTitle>
          <CardDescription>Top 10 playbooks by views in the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px] text-muted-foreground">
            No view data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Most Viewed Playbooks</CardTitle>
        <CardDescription>Top 10 playbooks by views in the last 30 days</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Playbook</TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Eye className="h-4 w-4" />
                  <span>Views</span>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>Viewers</span>
                </div>
              </TableHead>
              <TableHead className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Avg Time</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((playbook) => (
              <TableRow 
                key={playbook.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/knowledge-base/${playbook.id}`)}
              >
                <TableCell className="font-medium">{playbook.title}</TableCell>
                <TableCell className="text-center">{playbook.total_views}</TableCell>
                <TableCell className="text-center">{playbook.unique_viewers}</TableCell>
                <TableCell className="text-center">{formatTime(playbook.avg_time_spent)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
