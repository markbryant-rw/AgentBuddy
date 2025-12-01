import { PageHeaderWithBack } from '@/components/PageHeaderWithBack';
import { Card } from '@/components/ui/card';
import { UserPlus } from 'lucide-react';

export default function InviteUserPlatform() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeaderWithBack
        title="Invite New User"
        description="Send an invitation to a new user"
        backPath="/platform-admin"
      />
      
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="p-8">
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <UserPlus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">User Invitation Form</h3>
            <p className="text-muted-foreground">
              This feature is under development. User invitation functionality will be available soon.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
