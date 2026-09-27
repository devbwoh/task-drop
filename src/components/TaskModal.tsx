import { useEffect, useRef, useState } from 'react';
import type { Priority, Task } from '../types';
import { PRIORITY_META } from '../constants';
import type { NewTaskInput } from '../hooks/useBoard';

interface TaskModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  columnTitle?: string;
  task?: Task | null;
  onClose: () => void;
  onSubmit: (input: NewTaskInput) => void;
}

const PRIORITIES: Priority[] = ['low', 'medium', 'high'];

export function TaskModal(props: TaskModalProps) {
  if (!props.open) return null;
  // Keying by the task id (or "new") remounts the form so its fields
  // initialize directly from props instead of via an effect.
  const key = props.mode === 'edit' ? `edit-${props.task?.id ?? ''}` : 'create';
  return <TaskModalForm key={key} {...props} />;
}

function TaskModalForm({ mode, columnTitle, task, onClose, onSubmit }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [priority, setPriority] = useState<Priority>(task?.priority ?? 'medium');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title, description, priority });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-scale-in"
      >
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              {mode === 'create' ? 'New Task' : 'Edit Task'}
            </h2>
            {mode === 'create' && columnTitle && (
              <p className="mt-0.5 text-sm text-slate-400">Adding to {columnTitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Title</span>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add more details (optional)"
            rows={4}
            className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
        </label>

        <div className="mb-6">
          <span className="mb-2 block text-sm font-medium text-slate-700">Priority</span>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all ${
                  priority === p
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-700 ring-2 ring-inset ring-indigo-100'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${PRIORITY_META[p].dotClass}`} />
                {PRIORITY_META[p].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim()}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mode === 'create' ? 'Create Task' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
