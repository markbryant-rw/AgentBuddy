import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTeam } from '@/hooks/useTeam';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export interface DailyPlannerItem {
  id: string;
  team_id: string;
  title: string;
  scheduled_date: string;
  created_by: string;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  position: number;
  notes: string | null;
  estimated_minutes: number | null;
  size_category: 'big' | 'medium' | 'little';
  order_within_category: number;
  created_at: string;
  updated_at: string;
  assigned_users: Array<{
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }>;
}

export function useDailyPlanner(date: Date = new Date()) {
  const { user } = useAuth();
  const { team } = useTeam();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const dateStr = format(date, 'yyyy-MM-dd');

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['daily-planner', team?.id, dateStr],
    queryFn: async () => {
      if (!team?.id) return [];

      // Fetch items with assignments
      const { data, error } = await supabase
        .from('daily_planner_items')
        .select(`
          *,
          assignments:daily_planner_assignments(
            user_id,
            profiles:user_id(id, full_name, avatar_url)
          )
        `)
        .eq('team_id', team.id)
        .eq('date', dateStr)
        .order('position', { ascending: true });

      if (error) throw error;

      // Transform assignments into assigned_users array
      return (data || []).map((item: any) => ({
        ...item,
        scheduled_date: item.date,
        order_within_category: item.position,
        assigned_users: (item.assignments || []).map((a: any) => a.profiles).filter(Boolean),
      }));
    },
    enabled: !!team?.id && !!user,
  });

  const createItemMutation = useMutation({
    mutationFn: async ({ 
      title, 
      assignedUserIds = [], 
      estimatedMinutes,
      sizeCategory = 'medium'
    }: { 
      title: string; 
      assignedUserIds?: string[]; 
      estimatedMinutes?: number;
      sizeCategory?: 'big' | 'medium' | 'little';
    }) => {
      if (!team?.id || !user?.id) throw new Error('Missing team or user');

      // Get the max position and category order
      const categoryItems = items.filter(i => i.size_category === sizeCategory);
      const maxPosition = items.length > 0 
        ? Math.max(...items.map(i => i.position)) 
        : -1;
      const maxCategoryOrder = categoryItems.length > 0
        ? Math.max(...categoryItems.map(i => i.order_within_category))
        : -1;

      const { data: item, error: itemError } = await supabase
        .from('daily_planner_items')
        .insert({
          user_id: user.id,
          team_id: team.id,
          title,
          date: dateStr,
          created_by: user.id,
          position: maxPosition + 1,
          size_category: sizeCategory,
          estimated_minutes: estimatedMinutes,
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // No assignments table, just single user ownership

      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-planner'] });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: string; 
      updates: Partial<DailyPlannerItem>;
    }) => {
      const { error } = await supabase
        .from('daily_planner_items')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-planner'] });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('daily_planner_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-planner'] });
      toast({ title: 'Item deleted' });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ itemId, newPosition }: { itemId: string; newPosition: number }) => {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      // Get only UNCOMPLETED items in the same category
      const categoryItems = items
        .filter(i => i.size_category === item.size_category && !i.completed)
        .sort((a, b) => (a.order_within_category || 0) - (b.order_within_category || 0));

      const oldIndex = categoryItems.findIndex(i => i.id === itemId);
      
      // Reorder within category
      const reordered = [...categoryItems];
      const [removed] = reordered.splice(oldIndex, 1);
      reordered.splice(newPosition, 0, removed);

      // Update position for all items in this category
      for (let i = 0; i < reordered.length; i++) {
        await supabase
          .from('daily_planner_items')
          .update({ position: i })
          .eq('id', reordered[i].id);
      }
    },
    onMutate: async ({ itemId, newPosition }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['daily-planner', team?.id, dateStr] });
      
      // Snapshot previous value
      const previousItems = queryClient.getQueryData<DailyPlannerItem[]>(['daily-planner', team?.id, dateStr]);
      
      // Optimistically update
      if (previousItems) {
        const item = previousItems.find(i => i.id === itemId);
        if (item) {
          const categoryItems = previousItems
            .filter(i => i.size_category === item.size_category && !i.completed)
            .sort((a, b) => a.order_within_category - b.order_within_category);
          
          const oldIndex = categoryItems.findIndex(i => i.id === itemId);
          const reordered = [...categoryItems];
          const [removed] = reordered.splice(oldIndex, 1);
          reordered.splice(newPosition, 0, removed);
          
          // Update positions
          const updatedItems = previousItems.map(prevItem => {
            const reorderedItem = reordered.find(r => r.id === prevItem.id);
            if (reorderedItem) {
              const newOrder = reordered.indexOf(reorderedItem);
              return { ...prevItem, order_within_category: newOrder };
            }
            return prevItem;
          });
          
          queryClient.setQueryData(['daily-planner', team?.id, dateStr], updatedItems);
        }
      }
      
      return { previousItems };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(['daily-planner', team?.id, dateStr], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-planner', team?.id, dateStr] });
    },
  });

  const toggleCompleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const item = items.find(i => i.id === id);
      if (!item) return;

      const categoryItems = items.filter(i => i.size_category === item.size_category);
      const uncompletedItems = categoryItems.filter(i => !i.completed && i.id !== id);

      let newOrder: number;
      
      if (!item.completed) {
        // Marking as COMPLETE: Move to back of queue
        const maxUncompletedOrder = uncompletedItems.length > 0
          ? Math.max(...uncompletedItems.map(i => i.order_within_category))
          : -1;
        newOrder = maxUncompletedOrder + 1000; // Large gap to ensure it's at the back
      } else {
        // Marking as UNCOMPLETE: Place at end of live tasks
        const maxUncompletedOrder = uncompletedItems.length > 0
          ? Math.max(...uncompletedItems.map(i => i.order_within_category))
          : -1;
        newOrder = maxUncompletedOrder + 1;
      }

      const { error } = await supabase
        .from('daily_planner_items')
        .update({
          completed: !item.completed,
          completed_at: !item.completed ? new Date().toISOString() : null,
          completed_by: !item.completed ? user?.id : null,
          order_within_category: newOrder,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['daily-planner', team?.id, dateStr] });
      
      const previousItems = queryClient.getQueryData<DailyPlannerItem[]>(['daily-planner', team?.id, dateStr]);
      
      if (previousItems) {
        const item = previousItems.find(i => i.id === id);
        if (item) {
          const categoryItems = previousItems.filter(i => i.size_category === item.size_category);
          const uncompletedItems = categoryItems.filter(i => !i.completed && i.id !== id);
          
          let newOrder: number;
          if (!item.completed) {
            const maxUncompletedOrder = uncompletedItems.length > 0
              ? Math.max(...uncompletedItems.map(i => i.order_within_category))
              : -1;
            newOrder = maxUncompletedOrder + 1000;
          } else {
            const maxUncompletedOrder = uncompletedItems.length > 0
              ? Math.max(...uncompletedItems.map(i => i.order_within_category))
              : -1;
            newOrder = maxUncompletedOrder + 1;
          }
          
          const updatedItems = previousItems.map(prevItem => 
            prevItem.id === id 
              ? { 
                  ...prevItem, 
                  completed: !prevItem.completed,
                  completed_at: !prevItem.completed ? new Date().toISOString() : null,
                  completed_by: !prevItem.completed ? user?.id : null,
                  order_within_category: newOrder,
                }
              : prevItem
          );
          queryClient.setQueryData(['daily-planner', team?.id, dateStr], updatedItems);
        }
      }
      
      return { previousItems };
    },
    onError: (err, id, context) => {
      if (context?.previousItems) {
        queryClient.setQueryData(['daily-planner', team?.id, dateStr], context.previousItems);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-planner', team?.id, dateStr] });
    },
  });

  const updateAssignmentsMutation = useMutation({
    mutationFn: async ({ 
      itemId, 
      userIds 
    }: { 
      itemId: string; 
      userIds: string[];
    }) => {
      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from('daily_planner_assignments')
        .delete()
        .eq('planner_item_id', itemId);

      if (deleteError) throw deleteError;

      // Insert new assignments
      if (userIds.length > 0) {
        const { error: insertError } = await supabase
          .from('daily_planner_assignments')
          .insert(userIds.map(userId => ({
            planner_item_id: itemId,
            user_id: userId,
          })));
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-planner'] });
    },
  });

  const rollForwardMutation = useMutation({
    mutationFn: async ({ targetDate, currentDateStr, teamId }: { 
      targetDate: Date; 
      currentDateStr: string; 
      teamId: string;
    }) => {
      // Query database directly for uncompleted items
      const { data: uncompletedItems, error } = await supabase
        .from('daily_planner_items')
        .select('*')
        .eq('team_id', teamId)
        .eq('date', currentDateStr)
        .eq('completed', false);

      if (error) throw error;
      if (!uncompletedItems || uncompletedItems.length === 0) {
        return { totalMoved: 0, categoryCounts: { big: 0, medium: 0, little: 0 } };
      }

      const targetDateStr = format(targetDate, 'yyyy-MM-dd');

      // Group by category
      const bigItems = uncompletedItems.filter(i => i.size_category === 'big');
      const mediumItems = uncompletedItems.filter(i => i.size_category === 'medium');
      const littleItems = uncompletedItems.filter(i => i.size_category === 'little');

      // Update each category with sequential ordering
      const updateCategoryPositions = async (categoryItems: any[]) => {
        for (let i = 0; i < categoryItems.length; i++) {
          await supabase
            .from('daily_planner_items')
            .update({
              date: targetDateStr,
              position: i,
            })
            .eq('id', categoryItems[i].id);
        }
      };

      // Update all categories in parallel
      await Promise.all([
        updateCategoryPositions(bigItems),
        updateCategoryPositions(mediumItems),
        updateCategoryPositions(littleItems),
      ]);

      return {
        totalMoved: uncompletedItems.length,
        categoryCounts: {
          big: bigItems.length,
          medium: mediumItems.length,
          little: littleItems.length,
        },
      };
    },
    onSuccess: (result, payload) => {
      // Store roll forward metadata in localStorage
      if (team?.id && result.totalMoved > 0) {
        const metadata = {
          sourceDate: payload.currentDateStr,
          targetDate: format(payload.targetDate, 'yyyy-MM-dd'),
          tasksCount: result.totalMoved,
          categories: result.categoryCounts,
          timestamp: Date.now(),
        };
        localStorage.setItem(
          `rollForward_${team.id}_${format(payload.targetDate, 'yyyy-MM-dd')}`,
          JSON.stringify(metadata)
        );
      }

      queryClient.invalidateQueries({ queryKey: ['daily-planner'] });
      toast({
        title: 'Tasks rolled forward',
        description: `Moved ${result.totalMoved} uncompleted task${result.totalMoved !== 1 ? 's' : ''} to ${format(payload.targetDate, 'MMM d, yyyy')}`,
      });
    },
  });

  const moveToDateMutation = useMutation({
    mutationFn: async ({ itemId, newDate }: { itemId: string; newDate: Date }) => {
      const { error } = await supabase
        .from('daily_planner_items')
        .update({ 
          date: format(newDate, 'yyyy-MM-dd'),
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onMutate: async ({ itemId, newDate }) => {
      const oldDateStr = dateStr;
      const newDateStr = format(newDate, 'yyyy-MM-dd');
      
      // Cancel queries for both dates
      await queryClient.cancelQueries({ queryKey: ['daily-planner'] });
      
      // Get snapshots
      const previousOldDate = queryClient.getQueryData<DailyPlannerItem[]>(['daily-planner', team?.id, oldDateStr]);
      const previousNewDate = queryClient.getQueryData<DailyPlannerItem[]>(['daily-planner', team?.id, newDateStr]);
      
      // Remove from old date
      if (previousOldDate) {
        const updated = previousOldDate.filter(item => item.id !== itemId);
        queryClient.setQueryData(['daily-planner', team?.id, oldDateStr], updated);
      }
      
      // Add to new date
      if (previousNewDate) {
        const movedItem = previousOldDate?.find(item => item.id === itemId);
        if (movedItem) {
          const updated = [...previousNewDate, { ...movedItem, scheduled_date: newDateStr }];
          queryClient.setQueryData(['daily-planner', team?.id, newDateStr], updated);
        }
      }
      
      return { previousOldDate, previousNewDate, oldDateStr, newDateStr };
    },
    onError: (err, variables, context) => {
      if (context?.previousOldDate) {
        queryClient.setQueryData(['daily-planner', team?.id, context.oldDateStr], context.previousOldDate);
      }
      if (context?.previousNewDate) {
        queryClient.setQueryData(['daily-planner', team?.id, context.newDateStr], context.previousNewDate);
      }
      toast({
        title: 'Error',
        description: 'Failed to move task',
        variant: 'destructive',
      });
    },
    onSuccess: (_, { newDate }) => {
      toast({
        title: 'Task moved',
        description: `Moved to ${format(newDate, 'MMM d, yyyy')}`,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-planner'] });
    },
  });

  return {
    items,
    isLoading,
    createItem: (data: Parameters<typeof createItemMutation.mutate>[0]) => 
      createItemMutation.mutate(data),
    updateItem: (data: Parameters<typeof updateItemMutation.mutate>[0]) => 
      updateItemMutation.mutate(data),
    deleteItem: (id: string) => deleteItemMutation.mutate(id),
    reorderItem: (data: Parameters<typeof reorderMutation.mutate>[0]) => 
      reorderMutation.mutate(data),
    toggleComplete: (id: string) => toggleCompleteMutation.mutate(id),
    updateAssignments: (data: Parameters<typeof updateAssignmentsMutation.mutate>[0]) => 
      updateAssignmentsMutation.mutate(data),
    rollForward: (targetDate: Date) => rollForwardMutation.mutate({
      targetDate,
      currentDateStr: dateStr,
      teamId: team?.id || '',
    }),
    moveToDate: (data: Parameters<typeof moveToDateMutation.mutate>[0]) => 
      moveToDateMutation.mutate(data),
    uncompletedCount: items.filter(i => !i.completed).length,
  };
}
