import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallTypeSelectorProps {
  value: 'inbound' | 'outbound' | null;
  onChange: (value: 'inbound' | 'outbound') => void;
}

export const CallTypeSelector = ({ value, onChange }: CallTypeSelectorProps) => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Call Type</h2>
      <div className="grid md:grid-cols-2 gap-4">
        <Card
          className={cn(
            'cursor-pointer transition-all border-2',
            value === 'inbound'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          )}
          onClick={() => onChange('inbound')}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center',
                value === 'inbound' ? 'bg-primary/10' : 'bg-muted'
              )}>
                <PhoneIncoming className={cn(
                  'h-6 w-6',
                  value === 'inbound' ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
              <CardTitle>Inbound</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The prospect is calling you. They've shown interest and you need to qualify and convert them.
            </p>
          </CardContent>
        </Card>

        <Card
          className={cn(
            'cursor-pointer transition-all border-2',
            value === 'outbound'
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          )}
          onClick={() => onChange('outbound')}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className={cn(
                'w-12 h-12 rounded-lg flex items-center justify-center',
                value === 'outbound' ? 'bg-primary/10' : 'bg-muted'
              )}>
                <PhoneOutgoing className={cn(
                  'h-6 w-6',
                  value === 'outbound' ? 'text-primary' : 'text-muted-foreground'
                )} />
              </div>
              <CardTitle>Outbound</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              You're calling the prospect. They may not be expecting your call and you need to create interest.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
