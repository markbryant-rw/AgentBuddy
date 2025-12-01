import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50/20 to-white dark:from-indigo-900/5 dark:to-background">
      <div className="text-center space-y-6 p-8">
        <div className="relative inline-block">
          <div className="p-6 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30">
            <AlertCircle className="h-24 w-24 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="absolute -inset-2 rounded-2xl bg-indigo-500/20 animate-pulse-slow -z-10" />
        </div>
        <h1 className="text-6xl font-bold">404</h1>
        <p className="text-2xl font-semibold">Page Not Found</p>
        <p className="text-muted-foreground max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button size="lg" onClick={() => navigate('/')}>
          <Home className="h-5 w-5 mr-2" />
          Back to Home
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
