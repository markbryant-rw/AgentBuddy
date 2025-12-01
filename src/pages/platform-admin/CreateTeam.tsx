import { PageHeaderWithBack } from '@/components/PageHeaderWithBack';
import { Card } from '@/components/ui/card';
import { Users2 } from 'lucide-react';

export default function CreateTeam() {
  return (
    <div className="min-h-screen bg-background">
      <PageHeaderWithBack
        title="Create New Team"
        description="Add a new team to an office"
        backPath="/platform-admin"
      />
      
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="p-8">
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Users2 className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Team Creation Form</h3>
            <p className="text-muted-foreground">
              This feature is under development. Team creation functionality will be available soon.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
