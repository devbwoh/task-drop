import type { ColumnDef, Priority } from './types';

export const COLUMNS: ColumnDef[] = [
  { id: 'todo', title: 'To Do', accent: '#6366f1' },
  { id: 'inprogress', title: 'In Progress', accent: '#f59e0b' },
  { id: 'done', title: 'Done', accent: '#22c55e' },
];

export const PRIORITY_META: Record<
  Priority,
  { label: string; badgeClass: string; dotClass: string }
> = {
  low: {
    label: 'Low',
    badgeClass: 'bg-slate-100 text-slate-600 ring-slate-200',
    dotClass: 'bg-slate-400',
  },
  medium: {
    label: 'Medium',
    badgeClass: 'bg-amber-50 text-amber-700 ring-amber-200',
    dotClass: 'bg-amber-500',
  },
  high: {
    label: 'High',
    badgeClass: 'bg-rose-50 text-rose-700 ring-rose-200',
    dotClass: 'bg-rose-500',
  },
};

export const STORAGE_KEY = 'kanban.board.v1';
