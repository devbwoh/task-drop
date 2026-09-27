export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  createdAt: number;
}

export type ColumnId = 'todo' | 'inprogress' | 'done';

export interface ColumnDef {
  id: ColumnId;
  title: string;
  accent: string;
}

/** The board state is a map of column id -> ordered task ids. */
export type BoardState = Record<ColumnId, Task[]>;
