import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, Bug, Lightbulb } from 'lucide-react';
import { Link } from 'react-router-dom';

const APP_VERSION = '2.0.0';

export const HelpSupportCard = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Help & Support
        </CardTitle>
        <CardDescription>Get help and provide feedback</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* App Version */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">App Version</p>
              <p className="text-xs text-muted-foreground">Current version installed</p>
            </div>
            <div className="font-mono font-bold">{APP_VERSION}</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm">Quick Actions</h4>
          
          <Link to="/feature-request">
            <Button variant="outline" className="w-full justify-start">
              <Lightbulb className="h-4 w-4 mr-2" />
              Submit Feature Request
            </Button>
          </Link>

          <Link to="/bug-hunt">
            <Button variant="outline" className="w-full justify-start">
              <Bug className="h-4 w-4 mr-2" />
              Report a Bug
            </Button>
          </Link>
        </div>

        {/* Contact Support */}
        <div className="p-4 bg-muted/50 rounded-lg text-sm">
          <p className="font-medium mb-2">Need Help?</p>
          <p className="text-muted-foreground">
            For support or questions, email us at{' '}
            <a 
              href="mailto:support@agentbuddy.co" 
              className="text-primary hover:underline font-medium"
            >
              support@agentbuddy.co
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
