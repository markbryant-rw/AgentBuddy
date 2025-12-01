import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Phone, Mail, Copy, MoreVertical } from 'lucide-react';
import { ServiceProvider } from '@/hooks/directory/useServiceProviders';
import { toast } from 'sonner';

interface QuickActionsMenuProps {
  provider: ServiceProvider;
}

export const QuickActionsMenu = ({ provider }: QuickActionsMenuProps) => {
  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (provider.phone) {
      window.location.href = `tel:${provider.phone}`;
    }
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (provider.email) {
      window.location.href = `mailto:${provider.email}`;
    }
  };

  const handleCopy = async (e: React.MouseEvent, text: string, label: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {provider.phone && (
          <>
            <DropdownMenuItem onClick={handleCall}>
              <Phone className="h-4 w-4 mr-2" />
              Call
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleCopy(e, provider.phone!, 'Phone number')}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Phone
            </DropdownMenuItem>
          </>
        )}
        {provider.email && (
          <>
            <DropdownMenuItem onClick={handleEmail}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => handleCopy(e, provider.email!, 'Email')}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Email
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
