import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, UserPlus, MessageSquarePlus, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const QuickActionsWidget = () => {
  const navigate = useNavigate();

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center gap-3 mb-4">
        <Zap className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Quick Actions</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <Button 
          variant="outline" 
          size="sm"
          className="h-auto py-3 flex flex-col items-center gap-1"
          onClick={() => navigate('/platform-admin/users')}
        >
          <UserPlus className="h-4 w-4" />
          <span className="text-xs">Add User</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="h-auto py-3 flex flex-col items-center gap-1"
          onClick={() => navigate('/platform-admin/messages')}
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span className="text-xs">Announcement</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="h-auto py-3 flex flex-col items-center gap-1"
          onClick={() => navigate('/platform-admin/health')}
        >
          <RefreshCw className="h-4 w-4" />
          <span className="text-xs">Run Checks</span>
        </Button>
        <Button 
          variant="outline" 
          size="sm"
          className="h-auto py-3 flex flex-col items-center gap-1"
          onClick={() => navigate('/platform-admin/feedback')}
        >
          <MessageSquarePlus className="h-4 w-4" />
          <span className="text-xs">View Feedback</span>
        </Button>
      </div>
    </Card>
  );
};
