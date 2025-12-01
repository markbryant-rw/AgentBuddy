import { useState } from "react";
import { useLeadSources } from "@/hooks/useLeadSources";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const LeadSourceManager = () => {
  const { leadSources, addLeadSource, updateLeadSource, deleteLeadSource, isLoading } =
    useLeadSources();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const handleAdd = async () => {
    if (!newValue || !newLabel) return;

    try {
      await addLeadSource({ value: newValue, label: newLabel });
      setNewValue("");
      setNewLabel("");
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding lead source:", error);
    }
  };

  const handleToggleActive = async (id: string, currentState: boolean) => {
    try {
      await updateLeadSource({ id, updates: { is_active: !currentState } });
    } catch (error) {
      console.error("Error updating lead source:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this lead source?")) return;

    try {
      await deleteLeadSource(id);
    } catch (error) {
      console.error("Error deleting lead source:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Lead Source Options</CardTitle>
            <CardDescription>
              Manage the lead source options available when adding past sales
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Lead Source
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Lead Source</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="value">Value (internal)</Label>
                  <Input
                    id="value"
                    placeholder="e.g., newspaper_ad"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                  />
                </div>
                <div>
                  <Label htmlFor="label">Label (display)</Label>
                  <Input
                    id="label"
                    placeholder="e.g., Newspaper Ad"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAdd} disabled={!newValue || !newLabel}>
                    Add
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Loading...</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leadSources.map((source) => (
                <TableRow key={source.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  </TableCell>
                  <TableCell className="font-medium">{source.label}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {source.value}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={source.is_active}
                      onCheckedChange={() => handleToggleActive(source.id, source.is_active)}
                    />
                  </TableCell>
                  <TableCell>
                    {!source.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(source.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {leadSources.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No lead sources found. Add one to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadSourceManager;
