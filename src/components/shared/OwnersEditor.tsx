import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Star, Edit2, Check, X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Owner {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  is_primary: boolean;
  beacon_owner_id?: string;
}

interface OwnersEditorProps {
  owners: Owner[];
  onChange: (owners: Owner[]) => void;
  showBeaconSync?: boolean;
  className?: string;
  disabled?: boolean;
}

export const OwnersEditor = ({
  owners,
  onChange,
  showBeaconSync = false,
  className,
  disabled = false,
}: OwnersEditorProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Owner>>({});
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newOwner, setNewOwner] = useState<Partial<Owner>>({
    name: '',
    email: '',
    phone: '',
    is_primary: false,
  });

  const generateId = () => crypto.randomUUID();

  const handleAddOwner = () => {
    if (!newOwner.name?.trim()) return;

    const owner: Owner = {
      id: generateId(),
      name: newOwner.name.trim(),
      email: newOwner.email?.trim() || '',
      phone: newOwner.phone?.trim() || '',
      is_primary: owners.length === 0, // First owner is primary by default
    };

    onChange([...owners, owner]);
    setNewOwner({ name: '', email: '', phone: '', is_primary: false });
    setIsAddingNew(false);
  };

  const handleRemoveOwner = (id: string) => {
    const remaining = owners.filter(o => o.id !== id);
    // If we removed the primary owner, make the first remaining one primary
    if (remaining.length > 0 && !remaining.some(o => o.is_primary)) {
      remaining[0].is_primary = true;
    }
    onChange(remaining);
  };

  const handleSetPrimary = (id: string) => {
    onChange(owners.map(o => ({
      ...o,
      is_primary: o.id === id,
    })));
  };

  const handleStartEdit = (owner: Owner) => {
    setEditingId(owner.id);
    setEditForm({ ...owner });
  };

  const handleSaveEdit = () => {
    if (!editingId || !editForm.name?.trim()) return;

    onChange(owners.map(o => 
      o.id === editingId 
        ? { ...o, ...editForm, name: editForm.name!.trim() }
        : o
    ));
    setEditingId(null);
    setEditForm({});
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Owners ({owners.length})
        </Label>
        {!disabled && !isAddingNew && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddingNew(true)}
            className="h-7 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Owner
          </Button>
        )}
      </div>

      {/* Owner Cards */}
      <div className="space-y-2">
        {owners.map((owner) => (
          <Card key={owner.id} className={cn(
            "p-3 transition-all",
            owner.is_primary && "border-primary/50 bg-primary/5"
          )}>
            {editingId === owner.id ? (
              // Edit Mode
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    placeholder="Name"
                    value={editForm.name || ''}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={editForm.email || ''}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="h-8 text-sm"
                  />
                  <Input
                    placeholder="Phone"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-7"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleSaveEdit}
                    className="h-7"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{owner.name}</span>
                    {owner.is_primary && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        <Star className="h-2.5 w-2.5 mr-0.5 fill-current" />
                        Primary
                      </Badge>
                    )}
                    {showBeaconSync && owner.beacon_owner_id && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1 text-teal-600">
                        Synced
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {owner.email && <span className="truncate">{owner.email}</span>}
                    {owner.phone && <span>{owner.phone}</span>}
                  </div>
                </div>
                {!disabled && (
                  <div className="flex items-center gap-1 ml-2">
                    {!owner.is_primary && owners.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetPrimary(owner.id)}
                        className="h-7 w-7 p-0"
                        title="Set as primary"
                      >
                        <Star className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(owner)}
                      className="h-7 w-7 p-0"
                      title="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveOwner(owner.id)}
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}

        {/* Empty State */}
        {owners.length === 0 && !isAddingNew && (
          <div className="text-center py-4 text-muted-foreground text-sm border border-dashed rounded-lg">
            No owners added yet
          </div>
        )}

        {/* Add New Owner Form */}
        {isAddingNew && (
          <Card className="p-3 border-dashed">
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Name *"
                  value={newOwner.name || ''}
                  onChange={(e) => setNewOwner({ ...newOwner, name: e.target.value })}
                  className="h-8 text-sm"
                  autoFocus
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={newOwner.email || ''}
                  onChange={(e) => setNewOwner({ ...newOwner, email: e.target.value })}
                  className="h-8 text-sm"
                />
                <Input
                  placeholder="Phone"
                  value={newOwner.phone || ''}
                  onChange={(e) => setNewOwner({ ...newOwner, phone: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsAddingNew(false);
                    setNewOwner({ name: '', email: '', phone: '', is_primary: false });
                  }}
                  className="h-7"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleAddOwner}
                  disabled={!newOwner.name?.trim()}
                  className="h-7"
                >
                  Add
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

// Helper function to get primary owner from owners array
export const getPrimaryOwner = (owners: Owner[]): Owner | undefined => {
  return owners.find(o => o.is_primary) || owners[0];
};

// Helper to convert legacy single owner to owners array
export const legacyToOwners = (
  name?: string,
  email?: string,
  phone?: string,
  existingOwners?: Owner[]
): Owner[] => {
  // If we already have owners, return them
  if (existingOwners && existingOwners.length > 0) {
    return existingOwners;
  }
  
  // Convert legacy single owner to array
  if (name) {
    return [{
      id: crypto.randomUUID(),
      name,
      email: email || '',
      phone: phone || '',
      is_primary: true,
    }];
  }
  
  return [];
};

// Helper to sync primary owner back to legacy fields
export const ownersToLegacy = (owners: Owner[]): {
  vendor_name?: string;
  vendor_email?: string;
  vendor_mobile?: string;
} => {
  const primary = getPrimaryOwner(owners);
  if (!primary) return {};
  
  return {
    vendor_name: primary.name,
    vendor_email: primary.email,
    vendor_mobile: primary.phone,
  };
};