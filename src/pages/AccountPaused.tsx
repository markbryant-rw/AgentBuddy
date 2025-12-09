import { useLocation } from 'react-router-dom';
import { AlertTriangle, Mail, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { format, differenceInDays } from 'date-fns';

export default function AccountPaused() {
  const location = useLocation();
  const deletionDate = location.state?.deletionDate 
    ? new Date(location.state.deletionDate) 
    : null;

  const daysRemaining = deletionDate 
    ? Math.max(0, differenceInDays(deletionDate, new Date()))
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg border-destructive/20 shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            Account Paused
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Your organization's subscription has been cancelled
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Countdown Section */}
          {deletionDate && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-destructive mb-2">
                <Clock className="h-5 w-5" />
                <span className="font-semibold">Data Deletion Countdown</span>
              </div>
              
              {daysRemaining !== null && daysRemaining > 0 ? (
                <>
                  <div className="text-4xl font-bold text-destructive mb-1">
                    {daysRemaining}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    days until permanent deletion
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Scheduled for {format(deletionDate, 'MMMM d, yyyy')}
                  </p>
                </>
              ) : (
                <p className="text-sm text-destructive font-medium">
                  Your data is scheduled for deletion
                </p>
              )}
            </div>
          )}

          {/* What happens section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">What happens now?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>You and your team members cannot access the platform</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>Your data is preserved for 30 days from cancellation</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-destructive mt-0.5">•</span>
                <span>After 30 days, all data will be permanently deleted</span>
              </li>
            </ul>
          </div>

          {/* Reactivation CTA */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-foreground">Want to reactivate?</h3>
            <p className="text-sm text-muted-foreground">
              Contact us to restore your account and preserve all your data. 
              Reactivation is instant once your subscription is renewed.
            </p>
            <Button 
              variant="default" 
              className="w-full"
              onClick={() => window.location.href = 'mailto:mark@agentbuddy.co?subject=Reactivate%20AgentBuddy%20Account'}
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact mark@agentbuddy.co
            </Button>
          </div>

          {/* Help text */}
          <p className="text-xs text-center text-muted-foreground">
            If you believe this is an error, please contact support immediately.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
