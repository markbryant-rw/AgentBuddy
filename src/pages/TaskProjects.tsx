import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Kanban, Plus } from 'lucide-react';
import { useProjects, Project } from '@/hooks/useProjects';
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog';
import { EditProjectDialog } from '@/components/projects/EditProjectDialog';
import { EnhancedProjectBoardCard } from '@/components/tasks/enhanced/EnhancedProjectBoardCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function TaskProjects() {
  const navigate = useNavigate();
  const { projects, isLoading, deleteProject, duplicateProject, archiveProject } = useProjects();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const handleDeleteProject = async () => {
    if (deletingProject) {
      await deleteProject(deletingProject.id);
      setDeletingProject(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter out archived projects for the main view
  const activeProjects = projects.filter(p => p.status !== 'archived');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/operate-dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Operate
            </Button>
            <div className="flex items-center gap-2">
              <Kanban className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-semibold">Projects</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">Projects</h1>
              <p className="text-muted-foreground">Manage your projects with kanban boards</p>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeProjects.map((project) => (
              <EnhancedProjectBoardCard
                key={project.id}
                board={{
                  id: project.id,
                  title: project.title,
                  description: project.description,
                  icon: project.icon,
                  color: project.color,
                  is_shared: project.is_shared,
                  created_at: project.created_at,
                  updated_at: project.updated_at,
                }}
                taskStats={{
                  total: project.task_count || 0,
                  completed: project.completed_task_count || 0,
                  overdue: project.overdue_task_count || 0,
                }}
                onEdit={() => setEditingProject(project)}
                onDuplicate={() => duplicateProject(project.id)}
                onArchive={() => archiveProject(project.id)}
                onDelete={() => setDeletingProject(project)}
              />
            ))}
          </div>

          {activeProjects.length === 0 && (
            <div className="text-center py-12">
              <Kanban className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first project to get started with task management
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </div>
          )}
        </div>
      </div>

      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <EditProjectDialog
        open={!!editingProject}
        onOpenChange={(open) => !open && setEditingProject(null)}
        project={editingProject}
      />

      <AlertDialog open={!!deletingProject} onOpenChange={() => setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingProject?.title}" and all its tasks. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProject} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
