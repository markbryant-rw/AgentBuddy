import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Pencil, 
  Check, 
  X, 
  Share2, 
  Users,
  Tag,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskBoards } from '@/hooks/useTaskBoards';

interface EnhancedBoardHeaderProps {
  board: {
    id: string;
    title: string;
    description?: string | null;
    icon?: string | null;
    color?: string | null;
    is_shared: boolean;
  };
  taskStats?: {
    total: number;
    completed: number;
    overdue: number;
  };
  teamMembers?: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
  availableTags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  onFilterChange?: (filters: any) => void;
  currentView?: 'kanban' | 'list' | 'calendar';
  onViewChange?: (view: 'kanban' | 'list' | 'calendar') => void;
  onBack?: () => void;
}

export const EnhancedBoardHeader = ({
  board,
  taskStats = { total: 0, completed: 0, overdue: 0 },
  teamMembers = [],
  availableTags = [],
  onFilterChange,
  currentView = 'kanban',
  onViewChange,
  onBack,
}: EnhancedBoardHeaderProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(board.title);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const { updateBoard } = useTaskBoards();

  const progress = taskStats.total > 0 
    ? Math.round((taskStats.completed / taskStats.total) * 100) 
    : 0;

  const handleSaveTitle = async () => {
    if (editedTitle.trim() && editedTitle !== board.title) {
      await updateBoard({ 
        id: board.id, 
        updates: { title: editedTitle.trim() } 
      });
    }
    setIsEditingTitle(false);
  };

  const handleMemberToggle = (memberId: string) => {
    const newSelection = selectedMembers.includes(memberId)
      ? selectedMembers.filter(id => id !== memberId)
      : [...selectedMembers, memberId];
    setSelectedMembers(newSelection);
    onFilterChange?.({ members: newSelection, tags: selectedTags });
  };

  const handleTagToggle = (tagId: string) => {
    const newSelection = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    setSelectedTags(newSelection);
    onFilterChange?.({ members: selectedMembers, tags: newSelection });
  };

  const clearFilters = () => {
    setSelectedMembers([]);
    setSelectedTags([]);
    onFilterChange?.({ members: [], tags: [] });
  };

  const hasActiveFilters = selectedMembers.length > 0 || selectedTags.length > 0;

  return (
    <div className="bg-background border-b shadow-sm">
      <div className="px-4 py-2">
        {/* Compact Header Row */}
        <div className="flex items-center gap-3">
          {/* Back Button */}
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gap-1"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Boards</span>
            </Button>
          )}

          {/* Board Icon & Title */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-xl flex-shrink-0">{board.icon || '📋'}</span>
            {isEditingTitle ? (
              <div className="flex items-center gap-1 flex-1 max-w-xs">
                <Input
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveTitle();
                    if (e.key === 'Escape') {
                      setEditedTitle(board.title);
                      setIsEditingTitle(false);
                    }
                  }}
                  className="h-7 text-sm"
                  autoFocus
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleSaveTitle}>
                  <Check className="h-3 w-3" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  className="h-7 w-7" 
                  onClick={() => {
                    setEditedTitle(board.title);
                    setIsEditingTitle(false);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group min-w-0">
                <h1 className="text-lg font-semibold truncate">{board.title}</h1>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsEditingTitle(true)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Compact Progress */}
          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Progress:</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="h-5 text-xs">{taskStats.completed}/{taskStats.total}</Badge>
            </div>
            {taskStats.overdue > 0 && (
              <Badge variant="outline" className="h-5 text-xs border-destructive text-destructive">
                {taskStats.overdue} overdue
              </Badge>
            )}
          </div>

          {/* Compact Filters & Share */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Member Filter - Compact */}
            {teamMembers.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={cn("h-7", selectedMembers.length > 0 && "text-primary")}
                  >
                    <Users className="h-3.5 w-3.5" />
                    {selectedMembers.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 text-xs px-1">
                        {selectedMembers.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {teamMembers.map((member) => (
                    <DropdownMenuCheckboxItem
                      key={member.id}
                      checked={selectedMembers.includes(member.id)}
                      onCheckedChange={() => handleMemberToggle(member.id)}
                      className="text-sm"
                    >
                      <Avatar className="h-4 w-4 mr-2">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="text-[9px]">
                          {member.full_name?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      {member.full_name || 'Unnamed'}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Tag Filter - Compact */}
            {availableTags.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={cn("h-7", selectedTags.length > 0 && "text-primary")}
                  >
                    <Tag className="h-3.5 w-3.5" />
                    {selectedTags.length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-4 text-xs px-1">
                        {selectedTags.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {availableTags.map((tag) => (
                    <DropdownMenuCheckboxItem
                      key={tag.id}
                      checked={selectedTags.includes(tag.id)}
                      onCheckedChange={() => handleTagToggle(tag.id)}
                      className="text-sm"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full mr-2"
                        style={{ backgroundColor: tag.color }}
                      />
                      {tag.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm"
                className="h-7 text-xs"
                onClick={clearFilters}
              >
                Clear
              </Button>
            )}
            
            {/* Share Button */}
            <Button variant="ghost" size="sm" className="h-7 gap-1">
              <Share2 className="h-3.5 w-3.5" />
              <span className="text-xs">{board.is_shared ? 'Shared' : 'Share'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
