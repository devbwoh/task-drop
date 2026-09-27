export type Priority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  createdAt: number;
}

export interface ColumnDef {
  id: string;
  title: string;
}

export interface BoardState {
  columns: ColumnDef[];
  tasksByColumn: Record<string, Task[]>;
}
