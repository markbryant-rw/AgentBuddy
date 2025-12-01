import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, MessageSquare, Bug, Lightbulb } from 'lucide-react';
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

          <Button variant="outline" className="w-full justify-start" asChild>
            <a href="mailto:support@example.com?subject=Bug Report">
              <Bug className="h-4 w-4 mr-2" />
              Report a Bug
            </a>
          </Button>

          <Button variant="outline" className="w-full justify-start" asChild>
            <a href="mailto:support@example.com">
              <MessageSquare className="h-4 w-4 mr-2" />
              Contact Support
            </a>
          </Button>
        </div>

        {/* Documentation */}
        <div className="pt-4 border-t space-y-3">
          <h4 className="font-semibold text-sm">Documentation</h4>
          <div className="space-y-2 text-sm">
            <a href="#" className="block text-primary hover:underline">
              Getting Started Guide
            </a>
            <a href="#" className="block text-primary hover:underline">
              KPI Tracking Tutorial
            </a>
            <a href="#" className="block text-primary hover:underline">
              Module Documentation
            </a>
            <a href="#" className="block text-primary hover:underline">
              FAQ & Troubleshooting
            </a>
          </div>
        </div>

        {/* Support Hours */}
        <div className="p-4 bg-muted/50 rounded-lg text-sm">
          <p className="font-medium mb-1">Support Hours</p>
          <p className="text-muted-foreground">
            Monday - Friday: 9:00 AM - 5:00 PM AEST<br />
            Response time: Within 24 hours
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
