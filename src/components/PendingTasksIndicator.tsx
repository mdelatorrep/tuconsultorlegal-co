import React, { useState } from 'react';
import { usePendingTasks, getToolTypeName, PendingTask } from '@/hooks/usePendingTasks';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  FileText, 
  Target, 
  FileSignature,
  TrendingUp 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingTasksIndicatorProps {
  lawyerId: string;
  onTaskClick?: (task: PendingTask) => void;
}

const getToolIcon = (toolType: string) => {
  switch (toolType) {
    case 'research':
      return <Search className="h-4 w-4" />;
    case 'analysis':
      return <FileText className="h-4 w-4" />;
    case 'strategy':
      return <Target className="h-4 w-4" />;
    case 'drafting':
      return <FileSignature className="h-4 w-4" />;
    case 'prediction':
      return <TrendingUp className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const TaskItem: React.FC<{ task: PendingTask; onClick?: () => void }> = ({ task, onClick }) => {
  const timeAgo = formatDistanceToNow(new Date(task.createdAt), { 
    addSuffix: true, 
    locale: es 
  });

  return (
    <div 
      className={`p-3 border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors ${
        task.status === 'pending' ? 'bg-primary/5' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {getToolIcon(task.toolType)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm truncate">
              {getToolTypeName(task.toolType)}
            </span>
            {getStatusIcon(task.status)}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {task.title || task.query.substring(0, 60)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {timeAgo}
          </p>
          {task.status === 'pending' && (
            <Progress value={30} className="h-1 mt-2" />
          )}
        </div>
      </div>
    </div>
  );
};

export const PendingTasksIndicator: React.FC<PendingTasksIndicatorProps> = ({
  lawyerId,
  onTaskClick,
}) => {
  const [open, setOpen] = useState(false);
  const { tasks, pendingCount, isLoading } = usePendingTasks({ lawyerId });

  if (isLoading) return null;

  // Don't show if no tasks
  if (tasks.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="relative gap-2"
        >
          {pendingCount > 0 ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          <span className="hidden sm:inline">
            {pendingCount > 0 ? 'Procesando' : 'Tareas'}
          </span>
          {pendingCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b">
          <h4 className="font-semibold text-sm">Tareas en Proceso</h4>
          <p className="text-xs text-muted-foreground">
            {pendingCount > 0 
              ? `${pendingCount} tarea${pendingCount > 1 ? 's' : ''} en progreso`
              : 'Todas las tareas completadas'
            }
          </p>
        </div>
        <ScrollArea className="max-h-80">
          {tasks.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No hay tareas recientes
            </div>
          ) : (
            tasks.map((task) => (
              <TaskItem 
                key={task.id} 
                task={task}
                onClick={() => {
                  onTaskClick?.(task);
                  setOpen(false);
                }}
              />
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default PendingTasksIndicator;
