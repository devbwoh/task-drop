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
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Task } from './types';
import { useBoard } from './hooks/useBoard';
import type { NewTaskInput } from './hooks/useBoard';
import { Column } from './components/Column';
import { TaskCard } from './components/TaskCard';
import { TaskModal } from './components/TaskModal';

interface ModalState {
  open: boolean;
  mode: 'create' | 'edit';
  columnId?: string;
  task?: Task | null;
}

export default function App() {
  const { board, addTask, updateTask, deleteTask, moveTask, addColumn, deleteColumn, reorderColumns, resetBoard } = useBoard();
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'create' });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Flat lookup of every task by id for the drag overlay.
  const allTasks = useMemo(() => {
    const map = new Map<string, Task>();
    for (const col of board.columns) {
      for (const t of board.tasksByColumn[col.id] ?? []) map.set(t.id, t);
    }
    return map;
  }, [board]);

  const activeTask = activeId ? allTasks.get(activeId) : undefined;
  const isDraggingColumn = activeId !== null && !allTasks.has(activeId);

  function findColumnOf(taskId: string): string | null {
    for (const col of board.columns) {
      if ((board.tasksByColumn[col.id] ?? []).some((t) => t.id === taskId)) return col.id;
    }
    return null;
  }

  function resolveTargetColumn(overId: string): string | null {
    // Direct column id (hovering over header or empty area via sortable)
    if (board.columns.some((c) => c.id === overId)) return overId;
    // Droppable body of a column
    if (overId.startsWith('drop-')) return overId.slice(5);
    // A task id — find its parent column
    return findColumnOf(overId);
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;

    const activeType = (active.data.current as Record<string, string> | undefined)?.type;
    if (activeType === 'column') return; // Column reordering handled on dragEnd only.

    // Task dragging: move across columns live for smooth feedback.
    const fromCol = findColumnOf(String(active.id));
    const toCol = resolveTargetColumn(String(over.id));
    if (!fromCol || !toCol || fromCol === toCol) return;

    const targetTasks = board.tasksByColumn[toCol] ?? [];
    moveTask(String(active.id), toCol, targetTasks.length);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;

    const activeType = (active.data.current as Record<string, string> | undefined)?.type;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);

    // Column reordering — resolve target column in case over.id is a task or drop-zone id
    if (activeType === 'column') {
      const targetCol = resolveTargetColumn(overIdStr);
      if (!targetCol || targetCol === activeIdStr) return;
      reorderColumns(activeIdStr, targetCol);
      return;
    }

    // Task movement
    const fromCol = findColumnOf(activeIdStr);
    const toCol = resolveTargetColumn(overIdStr);
    if (!fromCol || !toCol) return;

    if (fromCol === toCol) {
      const items = board.tasksByColumn[toCol] ?? [];
      const oldIndex = items.findIndex((t) => t.id === activeIdStr);
      const newIndex = items.findIndex((t) => t.id === overIdStr);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const reordered = [...items];
        const [removed] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, removed);
        moveTask(activeIdStr, toCol, reordered.findIndex((t) => t.id === activeIdStr));
      }
    } else {
      // Cross-column: if over is a task, insert at that position; otherwise append.
      const targetTasks = board.tasksByColumn[toCol] ?? [];
      const overIndex = targetTasks.findIndex((t) => t.id === overIdStr);
      moveTask(activeIdStr, toCol, overIndex === -1 ? targetTasks.length : overIndex);
    }
  }

  function openCreate(columnId: string) {
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

  function handleAddColumn() {
    addColumn(newColTitle);
    setNewColTitle('');
    setAddingColumn(false);
  }

  const totalTasks = board.columns.reduce((n, c) => n + (board.tasksByColumn[c.id]?.length ?? 0), 0);

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
                {totalTasks} task{totalTasks === 1 ? '' : 's'} across {board.columns.length} columns
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
          <SortableContext items={board.columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            <div className="mx-auto flex h-full max-w-[1600px] gap-5 px-5 py-6 sm:px-8">
              {board.columns.map((col) => (
                <Column
                  key={col.id}
                  column={col}
                  tasks={board.tasksByColumn[col.id] ?? []}
                  onEdit={openEdit}
                  onDelete={deleteTask}
                  onAddClick={() => openCreate(col.id)}
                  onDeleteColumn={deleteColumn}
                />
              ))}

              {/* Add Column */}
              {addingColumn ? (
                <div className="flex w-[280px] shrink-0 flex-col gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={newColTitle}
                    onChange={(e) => setNewColTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddColumn();
                      if (e.key === 'Escape') {
                        setAddingColumn(false);
                        setNewColTitle('');
                      }
                    }}
                    placeholder="Column name…"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm outline-none ring-indigo-200 transition focus:ring-2"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddColumn}
                      disabled={!newColTitle.trim()}
                      className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-40"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAddingColumn(false);
                        setNewColTitle('');
                      }}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingColumn(true)}
                  className="flex w-[280px] shrink-0 items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 text-sm font-medium text-slate-400 transition-colors hover:border-indigo-300 hover:bg-indigo-50/30 hover:text-indigo-600"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Column
                </button>
              )}
            </div>
          </SortableContext>

          <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
            {activeTask ? (
              <div className="pointer-events-none">
                <TaskCard task={activeTask} onEdit={() => {}} onDelete={() => {}} />
              </div>
            ) : isDraggingColumn ? (
              <div className="pointer-events-none flex h-16 w-[320px] items-center justify-center rounded-2xl border-2 border-dashed border-indigo-300 bg-white/80 text-sm font-medium text-indigo-500 shadow-lg backdrop-blur">
                Moving column…
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      <TaskModal
        open={modal.open}
        mode={modal.mode}
        columnTitle={board.columns.find((c) => c.id === modal.columnId)?.title}
        task={modal.task}
        onClose={() => setModal({ open: false, mode: 'create' })}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
