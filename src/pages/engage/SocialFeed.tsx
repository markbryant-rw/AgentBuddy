import { SocialFeed as Feed } from '@/components/social/SocialFeed';
import { CreatePostForm } from '@/components/social/CreatePostForm';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function SocialFeed() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/engage-dashboard')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            Social Feed
          </h1>
          <p className="text-muted-foreground">
            Share wins, celebrate successes, and stay connected
          </p>
        </div>
      </div>

      {/* Create Post */}
      <CreatePostForm />

      {/* Feed */}
      <Feed />
    </div>
  );
}
