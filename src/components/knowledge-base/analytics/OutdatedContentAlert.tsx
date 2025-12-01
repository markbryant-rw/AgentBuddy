import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Calendar, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface OutdatedContent {
  id: string;
  title: string;
  updated_at: string;
  days_since_update: number;
  view_count_30d: number;
}

interface OutdatedContentAlertProps {
  data: OutdatedContent[] | undefined;
}

export function OutdatedContentAlert({ data }: OutdatedContentAlertProps) {
  const navigate = useNavigate();

  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Outdated Content</CardTitle>
          <CardDescription>Playbooks that may need review or updating</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[150px] text-muted-foreground">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>All playbooks are up to date!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Outdated Content</CardTitle>
        <CardDescription>Playbooks that may need review or updating</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((playbook) => (
          <Alert key={playbook.id} variant={playbook.view_count_30d === 0 ? "destructive" : "default"}>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="font-semibold mb-1">{playbook.title}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {playbook.days_since_update} days since update
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {playbook.view_count_30d} views (30d)
                    </span>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate(`/knowledge-base/edit/${playbook.id}`)}
                >
                  Review
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
}
