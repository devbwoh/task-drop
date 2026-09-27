import { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ColumnDef, Task } from '../types';
import { TaskCard } from './TaskCard';

interface ColumnProps {
  column: ColumnDef;
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onAddClick: () => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
}

export function Column({ column, tasks, onEdit, onDelete, onAddClick, onRenameColumn, onDeleteColumn }: ColumnProps) {
  const { setNodeRef, transform, transition, isDragging, attributes, listeners } = useSortable({
    id: column.id,
    data: { type: 'column' },
  });

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `drop-${column.id}`,
    data: { type: 'column-body', columnId: column.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(column.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [editingTitle]);

  function startRename() {
    setTitleDraft(column.title);
    setEditingTitle(true);
  }

  function commitRename() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== column.title) onRenameColumn(column.id, trimmed);
    setEditingTitle(false);
  }

  function cancelRename() {
    setTitleDraft(column.title);
    setEditingTitle(false);
  }

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={`flex h-full min-h-0 w-[320px] shrink-0 flex-col sm:w-auto sm:flex-1 ${
        isDragging ? 'z-50 opacity-80' : ''
      }`}
    >
      {/* Header — drag handle for column reordering */}
      <div
        {...attributes}
        {...listeners}
        className="mb-3 flex cursor-grab items-center justify-between px-1 active:cursor-grabbing"
      >
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
          {editingTitle ? (
            <input
              ref={titleInputRef}
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                // Keep keystrokes from reaching the sortable keyboard sensor,
                // which would otherwise start a column drag on Enter/Space.
                e.stopPropagation();
                if (e.key === 'Enter') commitRename();
                else if (e.key === 'Escape') cancelRename();
              }}
              onBlur={commitRename}
              className="w-40 rounded-lg border border-indigo-300 bg-white px-2 py-1 text-sm font-semibold tracking-wide text-slate-700 shadow-sm outline-none ring-2 ring-indigo-100"
            />
          ) : (
            <button
              type="button"
              onClick={startRename}
              onPointerDown={(e) => e.stopPropagation()}
              title="Rename column"
              className="max-w-[180px] truncate rounded-md px-1 py-0.5 text-left text-sm font-semibold tracking-wide text-slate-700 transition-colors hover:bg-white hover:text-indigo-600 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300"
            >
              {column.title}
            </button>
          )}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tabular-nums text-slate-500">
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteColumn(column.id);
            }}
            aria-label={`Delete column ${column.title}`}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onAddClick();
            }}
            aria-label={`Add task to ${column.title}`}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white hover:text-indigo-600 hover:shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Body — droppable area for tasks */}
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setDroppableRef}
          className={`flex h-full min-h-[calc(100vh-250px)] flex-1 flex-col gap-3 overflow-y-auto rounded-2xl border p-3 transition-colors duration-200 ${
            isOver
              ? 'border-indigo-300 bg-indigo-50/60 ring-2 ring-inset ring-indigo-200'
              : 'border-slate-200/70 bg-slate-100/40'
          }`}
        >
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
          ))}

          {tasks.length === 0 && (
            <div className="flex flex-1 items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-8 text-xs font-medium text-slate-400">
              Drop tasks here
            </div>
          )}
        </div>
      </SortableContext>
    </section>
  );
}
