import { useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { X, AlertCircle, Info, CheckCircle, AlertTriangle, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { useQuarterlyReview } from '@/hooks/useQuarterlyReview';

type NotificationType = 'quarterly_review' | 'announcement' | 'feature_update' | 'maintenance' | 'urgent' | 'celebration' | 'info' | 'success' | 'warning' | 'system';

export const NotificationBanner = () => {
  const navigate = useNavigate();
  const { notifications, markAsRead } = useNotifications();
  const { completeReview } = useQuarterlyReview();
  const [completingReview, setCompletingReview] = useState(false);
  
  // Filter for banner notifications that are unread and not expired
  const bannerNotifications = notifications.filter(
    (n: any) => n.display_as_banner && !n.read && 
    (!n.expires_at || new Date(n.expires_at) > new Date())
  );

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'quarterly_review':
        return <Calendar className="h-4 w-4" />;
      case 'system':
        return <AlertCircle className="h-4 w-4" />;
      case 'urgent':
        return <AlertCircle className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'success':
      case 'celebration':
        return <CheckCircle className="h-4 w-4" />;
      case 'info':
      case 'announcement':
      case 'feature_update':
      case 'maintenance':
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getAlertClassName = (type: NotificationType) => {
    switch (type) {
      case 'quarterly_review':
      case 'info':
      case 'announcement':
        return 'border-primary bg-primary/10';
      case 'system':
        return 'border-blue-500 bg-blue-500/10';
      case 'urgent':
        return 'border-destructive bg-destructive/10';
      case 'warning':
      case 'maintenance':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'success':
      case 'celebration':
        return 'border-green-500 bg-green-500/10';
      case 'feature_update':
        return 'border-blue-500 bg-blue-500/10';
      default:
        return 'border-primary bg-primary/10';
    }
  };

  const handleQuarterlyReviewComplete = async (notificationId: string) => {
    setCompletingReview(true);
    try {
      await completeReview();
      await markAsRead(notificationId);
    } catch (error) {
      console.error('Failed to complete quarterly review:', error);
    } finally {
      setCompletingReview(false);
    }
  };

  const handleDismiss = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  if (bannerNotifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {bannerNotifications.map((notification: any) => (
        <Alert 
          key={notification.id} 
          className={`relative ${getAlertClassName(notification.type)}`}
        >
          <div className="flex items-start gap-3 pr-8">
            {getIcon(notification.type)}
            <div className="flex-1 min-w-0">
              <AlertTitle className="flex items-center gap-2 mb-1">
                {notification.title}
              </AlertTitle>
              <AlertDescription className="mb-3">
                {notification.message}
              </AlertDescription>
              
              {/* Action Buttons */}
              <div className="flex gap-2">
                {notification.type === 'quarterly_review' && (
                  <>
                    <Button 
                      onClick={() => navigate('/review-roadmap')} 
                      size="sm"
                    >
                      Start Review
                    </Button>
                    <Button 
                      onClick={() => handleQuarterlyReviewComplete(notification.id)}
                      variant="outline"
                      size="sm"
                      disabled={completingReview}
                    >
                      {completingReview ? 'Marking...' : 'Mark as Complete'}
                    </Button>
                  </>
                )}
                
                {notification.metadata?.action_url && (
                  <Button 
                    onClick={() => {
                      navigate(notification.metadata.action_url);
                      handleDismiss(notification.id);
                    }}
                    size="sm"
                  >
                    {notification.metadata?.action_label || 'View'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Dismiss Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 h-6 w-6 p-0"
            onClick={() => handleDismiss(notification.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      ))}
    </div>
  );
};
