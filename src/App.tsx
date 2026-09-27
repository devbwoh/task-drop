import { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { CollisionDetection, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { Task } from './types';
import { useBoard } from './hooks/useBoard';
import type { NewTaskInput } from './hooks/useBoard';
import { Column } from './components/Column';
import { TaskCard } from './components/TaskCard';
import { TaskModal } from './components/TaskModal';
import { ConfirmDialog } from './components/ConfirmDialog';

interface ModalState {
  open: boolean;
  mode: 'create' | 'edit';
  columnId?: string;
  task?: Task | null;
}

const boardCollisionDetection: CollisionDetection = (args) => {
  const activeType = args.active.data.current?.type;
  if (activeType === 'column') {
    return closestCorners({
      ...args,
      droppableContainers: args.droppableContainers.filter(
        (container) => container.id !== args.active.id && container.data.current?.type === 'column',
      ),
    });
  }
  // Task dragging: pointerWithin ensures the column under the cursor is detected
  // even when it has zero tasks (no task corners to compete in closestCorners).
  const pointerResult = pointerWithin(args);
  if (pointerResult.length > 0) return pointerResult;
  return closestCorners(args);
};

export default function App() {
  const { board, addTask, updateTask, deleteTask, moveTask, addColumn, updateColumn, deleteColumn, reorderColumns, resetBoard } = useBoard();
  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'create' });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColTitle, setNewColTitle] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);
  const [blockedDeleteColumn, setBlockedDeleteColumn] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  function requestDeleteTask(taskId: string) {
    setDeleteTaskId(taskId);
  }

  function requestDeleteColumn(columnId: string) {
    if (board.columns.length <= 1) {
      setBlockedDeleteColumn(true);
      return;
    }
    setDeleteColumnId(columnId);
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

  // Card search: case-insensitive match against title and description.
  const query = searchQuery.trim().toLowerCase();
  function matchesQuery(task: Task): boolean {
    if (!query) return true;
    return task.title.toLowerCase().includes(query) || task.description.toLowerCase().includes(query);
  }
  const totalMatches = board.columns.reduce(
    (n, c) => n + (board.tasksByColumn[c.id] ?? []).filter(matchesQuery).length,
    0,
  );

  return (
    <div className="flex h-screen flex-col bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 text-slate-900">
      {/* Header */}
      <header className="relative z-40 shrink-0 border-b border-slate-200/70 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="Flowboard logo" className="h-9 w-9 rounded-xl shadow-md shadow-indigo-200" />
            <div>
              <h1 className="text-base font-bold leading-tight tracking-tight text-slate-800">
                Flowboard
              </h1>
              <p className="hidden text-xs text-slate-400 sm:block">
                {totalTasks} task{totalTasks === 1 ? '' : 's'} across {board.columns.length} columns
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Card search filter */}
            <div className="relative hidden sm:block">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.5" y2="16.5" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cards…"
                aria-label="Search cards"
                className="w-40 rounded-xl border border-slate-200 bg-white/80 py-2 pl-9 pr-16 text-sm text-slate-700 shadow-sm outline-none transition focus:w-56 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 lg:w-48"
              />
              {searchQuery && (
                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
                  <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-500">
                    {totalMatches}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="rounded-md p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Reset board — low-frequency, demoted to a subtle icon button */}
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              aria-label="Reset board"
              title="Reset board"
              className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 active:scale-[0.98]"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>

            {/* Add Column — primary, high-frequency action */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAddingColumn((v) => !v)}
                aria-expanded={addingColumn}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold shadow-md transition-all active:scale-[0.98] ${
                  addingColumn
                    ? 'bg-indigo-700 text-white shadow-indigo-300'
                    : 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-200 hover:from-indigo-600 hover:to-violet-700'
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add Column
              </button>

              {addingColumn && (
                <>
                  {/* Click-away backdrop */}
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => {
                      setAddingColumn(false);
                      setNewColTitle('');
                    }}
                  />
                  <div className="absolute right-0 top-full z-40 mt-2 w-[280px] rounded-2xl border border-slate-200/70 bg-white p-3 shadow-xl">
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
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm outline-none ring-indigo-200 transition focus:ring-2"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={handleAddColumn}
                        disabled={!newColTitle.trim()}
                        className="flex-1 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-40"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddingColumn(false);
                          setNewColTitle('');
                        }}
                        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 active:scale-[0.98]"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Board */}
      <main className="flex-1 overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={boardCollisionDetection}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <SortableContext items={board.columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            <div className="mx-auto flex h-full max-w-[1600px] gap-5 px-5 py-6 sm:px-8">
              {board.columns.map((col) => {
                const colTasks = (board.tasksByColumn[col.id] ?? []).filter(matchesQuery);
                return (
                  <Column
                    key={col.id}
                    column={col}
                    tasks={colTasks}
                    emptyMessage={query ? 'No matching cards' : undefined}
                    onEdit={openEdit}
                    onDelete={requestDeleteTask}
                    onAddClick={() => openCreate(col.id)}
                    onRenameColumn={updateColumn}
                    onDeleteColumn={requestDeleteColumn}
                  />
                );
              })}
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

      <ConfirmDialog
        open={confirmReset}
        title="Reset board?"
        message="This clears all columns and tasks and restores the default layout. This can't be undone."
        confirmLabel="Reset board"
        cancelLabel="Cancel"
        onConfirm={() => {
          resetBoard();
          setConfirmReset(false);
        }}
        onCancel={() => setConfirmReset(false)}
      />

      <ConfirmDialog
        open={deleteTaskId !== null}
        title="Delete task?"
        message={`"${allTasks.get(deleteTaskId ?? '')?.title ?? 'This task'}" will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (deleteTaskId) deleteTask(deleteTaskId);
          setDeleteTaskId(null);
        }}
        onCancel={() => setDeleteTaskId(null)}
      />

      <ConfirmDialog
        open={deleteColumnId !== null}
        title="Delete column?"
        message={`"${board.columns.find((c) => c.id === deleteColumnId)?.title ?? 'This column'}" and its ${
          (deleteColumnId ? board.tasksByColumn[deleteColumnId]?.length : 0) ?? 0
        } task(s) will be permanently removed.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          if (deleteColumnId) deleteColumn(deleteColumnId);
          setDeleteColumnId(null);
        }}
        onCancel={() => setDeleteColumnId(null)}
      />

      <ConfirmDialog
        open={blockedDeleteColumn}
        tone="info"
        title="Can't delete this column"
        message="A board needs at least one column, so the last remaining column can't be deleted."
        confirmLabel="Got it"
        onConfirm={() => setBlockedDeleteColumn(false)}
        onCancel={() => setBlockedDeleteColumn(false)}
      />
    </div>
  );
}
