import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { MessageSquare, Clock } from "lucide-react";

export const MessagesDropdown = () => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative opacity-50 cursor-not-allowed">
          <MessageSquare className="h-6 w-6" />
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-[320px] p-0" align="end">
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <div className="p-4 rounded-full bg-muted mb-4">
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Coming Soon</h3>
          <p className="text-sm text-muted-foreground">
            Team messaging is being rebuilt for a better experience. Check back soon!
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
