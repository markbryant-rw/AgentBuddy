import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Building2, Users, Globe, X } from 'lucide-react';
import { useTemplateAssignments } from '@/hooks/useTemplateAssignments';
import { usePlatformTeamManagement } from '@/hooks/usePlatformTeamManagement';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TemplateAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId: string;
  templateName: string;
}

export const TemplateAssignmentDialog = ({
  open,
  onOpenChange,
  templateId,
  templateName,
}: TemplateAssignmentDialogProps) => {
  const [assignmentType, setAssignmentType] = useState<'system' | 'agency' | 'team'>('system');
  const [selectedId, setSelectedId] = useState('');
  
  const { assignments, createAssignment, deleteAssignment } = useTemplateAssignments(templateId);
  const { officesWithTeams } = usePlatformTeamManagement();

  const handleAssign = async () => {
    if (assignmentType === 'system') {
      // System-wide is handled by is_system_default flag on the template itself
      // This would require a separate mutation to update the template
      return;
    }

    if (!selectedId) return;

    await createAssignment({
      templateId,
      assignedToType: assignmentType as 'agency' | 'team',
      assignedToId: selectedId,
    });

    setSelectedId('');
  };

  const handleRemoveAssignment = async (assignmentId: string) => {
    await deleteAssignment(assignmentId);
  };

  const getAssignmentLabel = (assignment: any) => {
    if (assignment.assigned_to_type === 'agency') {
      const office = officesWithTeams.find(o => o.id === assignment.assigned_to_id);
      return office ? `Office: ${office.name}` : 'Unknown Office';
    } else {
      const office = officesWithTeams.find(o => 
        o.teams.some((t: any) => t.id === assignment.assigned_to_id)
      );
      const team = office?.teams.find((t: any) => t.id === assignment.assigned_to_id);
      return team ? `Team: ${team.name}` : 'Unknown Team';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Assign Template</DialogTitle>
          <DialogDescription>
            Control who can access "{templateName}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Assignments */}
          {assignments.length > 0 && (
            <div className="space-y-2">
              <Label>Current Assignments</Label>
              <ScrollArea className="h-24 rounded-md border p-2">
                <div className="space-y-2">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="flex items-center justify-between">
                      <Badge variant="secondary" className="flex items-center gap-2">
                        {assignment.assigned_to_type === 'agency' ? (
                          <Building2 className="h-3 w-3" />
                        ) : (
                          <Users className="h-3 w-3" />
                        )}
                        {getAssignmentLabel(assignment)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveAssignment(assignment.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* New Assignment */}
          <div className="space-y-4">
            <Label>Add New Assignment</Label>
            
            <RadioGroup value={assignmentType} onValueChange={(v: any) => setAssignmentType(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="system" id="system" />
                <Label htmlFor="system" className="flex items-center gap-2 cursor-pointer">
                  <Globe className="h-4 w-4" />
                  System-wide (all users)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="agency" id="agency" />
                <Label htmlFor="agency" className="flex items-center gap-2 cursor-pointer">
                  <Building2 className="h-4 w-4" />
                  Specific Office
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="team" id="team" />
                <Label htmlFor="team" className="flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  Specific Team
                </Label>
              </div>
            </RadioGroup>

            {assignmentType === 'agency' && (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an office" />
                </SelectTrigger>
                <SelectContent>
                  {officesWithTeams.map((office) => (
                    <SelectItem key={office.id} value={office.id}>
                      {office.name} ({office.teams.length} teams)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {assignmentType === 'team' && (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent>
                  {officesWithTeams.map((office) => (
                    <optgroup key={office.id} label={office.name}>
                      {office.teams.map((team: any) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </optgroup>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button 
              onClick={handleAssign}
              disabled={assignmentType !== 'system' && !selectedId}
            >
              Add Assignment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
