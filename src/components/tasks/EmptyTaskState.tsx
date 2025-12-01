import emptyListImg from '@/assets/empty-list.png';

export const EmptyTaskState = () => {
  return (
    <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
      <img 
        src={emptyListImg} 
        alt="Empty task list" 
        className="h-24 w-24 mb-3 object-contain opacity-60"
      />
      <p className="text-sm font-medium text-gray-500 mb-1">No tasks yet</p>
      <p className="text-xs text-gray-400">Click "Add a task" above to get started</p>
    </div>
  );
};
