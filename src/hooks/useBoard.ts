import { useCallback, useEffect, useState } from 'react';
import type { BoardState, ColumnDef, Priority, Task } from '../types';
import { STORAGE_KEY } from '../constants';
import { SEED_BOARD } from '../seed';

function loadBoard(): BoardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_BOARD;
    const parsed = JSON.parse(raw) as Partial<BoardState>;
    if (!Array.isArray(parsed.columns) || typeof parsed.tasksByColumn !== 'object') {
      return SEED_BOARD;
    }
    const columns: ColumnDef[] = parsed.columns.filter(
      (c): c is ColumnDef => !!c && typeof c.id === 'string' && typeof c.title === 'string',
    );
    const tasksByColumn: Record<string, Task[]> = {};
    for (const col of columns) {
      const tasks = parsed.tasksByColumn[col.id];
      tasksByColumn[col.id] = Array.isArray(tasks) ? tasks : [];
    }
    return { columns, tasksByColumn };
  } catch {
    return SEED_BOARD;
  }
}

export interface NewTaskInput {
  title: string;
  description: string;
  priority: Priority;
}

export function useBoard() {
  const [board, setBoard] = useState<BoardState>(loadBoard);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
    } catch {
      // Ignore quota / serialization errors.
    }
  }, [board]);

  const addTask = useCallback((columnId: string, input: NewTaskInput) => {
    const task: Task = {
      id: crypto.randomUUID(),
      title: input.title.trim() || 'Untitled task',
      description: input.description.trim(),
      priority: input.priority,
      createdAt: Date.now(),
    };
    setBoard((prev) => ({
      ...prev,
      tasksByColumn: {
        ...prev.tasksByColumn,
        [columnId]: [task, ...(prev.tasksByColumn[columnId] ?? [])],
      },
    }));
  }, []);

  const updateTask = useCallback(
    (taskId: string, input: NewTaskInput) => {
      setBoard((prev) => {
        const nextTasks: Record<string, Task[]> = {};
        for (const col of prev.columns) {
          nextTasks[col.id] = (prev.tasksByColumn[col.id] ?? []).map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  title: input.title.trim() || 'Untitled task',
                  description: input.description.trim(),
                  priority: input.priority,
                }
              : t,
          );
        }
        return { ...prev, tasksByColumn: nextTasks };
      });
    },
    [],
  );

  const deleteTask = useCallback((taskId: string) => {
    setBoard((prev) => {
      const nextTasks: Record<string, Task[]> = {};
      for (const col of prev.columns) {
        nextTasks[col.id] = (prev.tasksByColumn[col.id] ?? []).filter((t) => t.id !== taskId);
      }
      return { ...prev, tasksByColumn: nextTasks };
    });
  }, []);

  const moveTask = useCallback(
    (taskId: string, toColumnId: string, toIndex: number) => {
      setBoard((prev) => {
        let moving: Task | undefined;
        for (const col of prev.columns) {
          const found = (prev.tasksByColumn[col.id] ?? []).find((t) => t.id === taskId);
          if (found) {
            moving = found;
            break;
          }
        }
        if (!moving) return prev;

        const nextTasks: Record<string, Task[]> = {};
        for (const col of prev.columns) {
          nextTasks[col.id] = (prev.tasksByColumn[col.id] ?? []).filter((t) => t.id !== taskId);
        }
        const target = [...(nextTasks[toColumnId] ?? [])];
        const clamped = Math.max(0, Math.min(toIndex, target.length));
        target.splice(clamped, 0, moving);
        nextTasks[toColumnId] = target;
        return { ...prev, tasksByColumn: nextTasks };
      });
    },
    [],
  );

  const addColumn = useCallback((title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const newCol: ColumnDef = { id: crypto.randomUUID(), title: trimmed };
    setBoard((prev) => ({
      columns: [...prev.columns, newCol],
      tasksByColumn: { ...prev.tasksByColumn, [newCol.id]: [] },
    }));
  }, []);

  const deleteColumn = useCallback((columnId: string) => {
    setBoard((prev) => {
      if (prev.columns.length <= 1) return prev;
      const columns = prev.columns.filter((c) => c.id !== columnId);
      const nextTasks = { ...prev.tasksByColumn };
      delete nextTasks[columnId];
      return { columns, tasksByColumn: nextTasks };
    });
  }, []);

  const reorderColumns = useCallback(
    (activeId: string, overId: string) => {
      setBoard((prev) => {
        const oldIndex = prev.columns.findIndex((c) => c.id === activeId);
        const newIndex = prev.columns.findIndex((c) => c.id === overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return prev;
        const columns = [...prev.columns];
        const [removed] = columns.splice(oldIndex, 1);
        columns.splice(newIndex, 0, removed);
        return { ...prev, columns };
      });
    },
    [],
  );

  const resetBoard = useCallback(() => {
    setBoard(SEED_BOARD);
  }, []);

  return {
    board,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    addColumn,
    deleteColumn,
    reorderColumns,
    resetBoard,
  };
}
