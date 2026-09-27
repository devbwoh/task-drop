import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { ColumnId, Task } from './types';
import { COLUMNS } from './constants';
import { useBoard } from './hooks/useBoard';
import type { NewTaskInput } from './hooks/useBoard';
import { Column } from './components/Column';
import { TaskCard } from './components/TaskCard';
import { TaskModal } from './components/TaskModal';

interface ModalState {
  open: boolean;
  mode: 'create' | 'edit';
  columnId?: ColumnId;
  task?: Task | null;
}

export default function App() {
  const { board, addTask, updateTask, deleteTask, moveTask, resetBoard } = useBoard();
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'create' });
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // A flat lookup of every task by id for the drag overlay.
  const allTasks = useMemo(() => {
    const map = new Map<string, Task>();
    for (const col of COLUMNS) for (const t of board[col.id]) map.set(t.id, t);
    return map;
  }, [board]);

  const activeTask = activeId ? allTasks.get(activeId) : undefined;

  function findColumnOf(taskId: string): ColumnId | null {
    for (const col of COLUMNS) if (board[col.id].some((t) => t.id === taskId)) return col.id;
    return null;
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  // Reorder within a column while hovering, for smooth live feedback.
  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeCol = findColumnOf(String(active.id));
    const overCol = findColumnOf(String(over.id)) ?? (String(over.id) as ColumnId);
    if (!activeCol || !overCol || activeCol === overCol) return;

    // Moving across columns: place at the end of the target column.
    moveTask(String(active.id), overCol, board[overCol].length);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeIdStr = String(active.id);
    const fromCol = findColumnOf(activeIdStr);
    const toCol = findColumnOf(String(over.id)) ?? (String(over.id) as ColumnId);
    if (!fromCol || !toCol) return;

    if (fromCol === toCol) {
      const items = board[toCol];
      const oldIndex = items.findIndex((t) => t.id === activeIdStr);
      const newIndex = items.findIndex((t) => t.id === String(over.id));
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        moveTask(activeIdStr, toCol, arrayMove(items.map((t) => t.id), oldIndex, newIndex).indexOf(activeIdStr));
      }
    } else {
      const items = board[toCol];
      const overIndex = items.findIndex((t) => t.id === String(over.id));
      moveTask(activeIdStr, toCol, overIndex === -1 ? items.length : overIndex);
    }
  }

  function openCreate(columnId: ColumnId) {
    setModal({ open: true, mode: 'create', columnId });
  }

  function openEdit(task: Task) {
    setModal({ open: true, mode: 'edit', task });
  }

  function handleSubmit(input: NewTaskInput) {
    if (modal.mode === 'create' && modal.columnId) {
      addTask(modal.columnId, input);
    } else if (modal.mode === 'edit' && modal.task) {
      updateTask(modal.task.id, input);
    }
    setModal({ open: false, mode: 'create' });
  }

  const totalTasks = COLUMNS.reduce((n, c) => n + board[c.id].length, 0);

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 text-slate-900">
      {/* Header */}
      <header className="shrink-0 border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="18" rx="1.5" />
                <rect x="14" y="3" width="7" height="11" rx="1.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight text-slate-800">
                Flowboard
              </h1>
              <p className="hidden text-xs text-slate-400 sm:block">
                {totalTasks} task{totalTasks === 1 ? '' : 's'} across {COLUMNS.length} columns
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetBoard}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            <span className="hidden sm:inline">Reset board</span>
          </button>
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="mx-auto flex h-full max-w-[1600px] gap-5 px-5 py-6 sm:px-8">
            {COLUMNS.map((col) => (
              <Column
                key={col.id}
                column={col}
                tasks={board[col.id]}
                onEdit={openEdit}
                onDelete={deleteTask}
                onAddClick={() => openCreate(col.id)}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {activeTask ? (
              <div className="pointer-events-none">
                <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      <TaskModal
        open={modal.open}
        mode={modal.mode}
        columnTitle={COLUMNS.find((c) => c.id === modal.columnId)?.title}
        task={modal.task}
        onClose={() => setModal({ open: false, mode: 'create' })}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
