import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function CreateAdminUser() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const createAdmin = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        'https://mxsefnpxrnamupatgrlb.supabase.co/functions/v1/create-admin-user',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14c2VmbnB4cm5hbXVwYXRncmxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ0MDE3ODQsImV4cCI6MjA3OTk3Nzc4NH0.VNageWt6qo_XR2G37f_tcyCisQZ4wJ24bBGj3QCtTYs',
          },
          body: JSON.stringify({
            email: 'mark.bryant@raywhite.com',
            password: 'TempPass123!',
            full_name: 'Mark Bryant',
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create admin user');
      }

      const result = await response.json();
      console.log('Admin created:', result);

      toast.success('Admin account created!', {
        description: 'You can now log in with:\nEmail: mark.bryant@raywhite.com\nPassword: TempPass123!',
      });

      // Wait a bit then navigate to login
      setTimeout(() => {
        navigate('/auth');
      }, 3000);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create admin user', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create Platform Admin</CardTitle>
          <CardDescription>
            This will create an admin account for Mark Bryant
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2 text-sm">
            <p><strong>Email:</strong> mark.bryant@raywhite.com</p>
            <p><strong>Name:</strong> Mark Bryant</p>
            <p><strong>Role:</strong> Platform Admin</p>
            <p><strong>Temporary Password:</strong> TempPass123!</p>
          </div>
          
          <Button 
            onClick={createAdmin} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Creating Admin...' : 'Create Admin User'}
          </Button>

          <p className="text-xs text-muted-foreground">
            After creation, use these credentials to log in at the auth page.
            Change your password after first login.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
