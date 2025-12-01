import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const ComingSoon = () => {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto rounded-lg bg-primary/10 p-4 w-fit mb-4">
            <Users className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Role Playing Module</CardTitle>
          <CardDescription>
            Practice real estate scenarios, improve your skills, and track your progress
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            This module is currently being integrated into AgentBuddy. 
            You'll soon be able to practice objection handling, buyer consultations, and more.
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
