import { useParams } from 'react-router-dom';
import TaskManager from './TaskManager';

export default function TaskProjectBoard() {
  const { boardId } = useParams<{ boardId: string }>();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <TaskManager boardId={boardId} />
    </div>
  );
}
