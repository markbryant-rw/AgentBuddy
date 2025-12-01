import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NoTeamConfigured = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl">No Team Assigned</CardTitle>
          <CardDescription>
            You haven't been assigned to a team yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">What does this mean?</p>
              <p>Your account exists, but you need to be added to a team by your Office Manager or Team Leader before you can access the full platform.</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Next steps:</strong>
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Contact your Office Manager or Team Leader</li>
              <li>They can add you to a team in the management dashboard</li>
              <li>Once added, refresh this page to continue</li>
            </ul>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
            <Button 
              variant="default" 
              className="flex-1"
              onClick={() => navigate('/profile')}
            >
              View Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
