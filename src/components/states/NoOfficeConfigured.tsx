import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, AlertCircle } from 'lucide-react';

export const NoOfficeConfigured = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">No Office Selected</CardTitle>
          <CardDescription>
            You need to select an office to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">What does this mean?</p>
              <p>Your role allows you to manage multiple offices, but you need to select an active office to view its data.</p>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Next steps:</strong>
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Use the office switcher in the header to select an office</li>
              <li>Once selected, the dashboard will load your office data</li>
            </ul>
          </div>

          <Button 
            variant="default" 
            className="w-full"
            onClick={() => window.location.reload()}
          >
            Refresh Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
