import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';

const ComingSoon = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto rounded-lg bg-primary/10 p-4 w-fit mb-4">
            <ClipboardList className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Vendor Reporting Module</CardTitle>
          <CardDescription>
            Manage vendor relationships, generate reports, and track performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            This module is currently being integrated into AgentBuddy. 
            You'll soon be able to manage vendors, generate reports, and analyze vendor performance.
          </p>
          <Link to="/" className="block">
            <Button className="w-full" variant="outline">
              Back to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default ComingSoon;
