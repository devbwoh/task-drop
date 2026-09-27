import { useCallback, useEffect, useState } from 'react';
import type { BoardState, ColumnId, Priority, Task } from '../types';
import { COLUMNS, STORAGE_KEY } from '../constants';
import { SEED_BOARD } from '../seed';

function loadBoard(): BoardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_BOARD;
    const parsed = JSON.parse(raw) as Partial<Record<ColumnId, Task[]>>;
    // Ensure every column exists even if the stored shape is stale.
    const board: BoardState = { todo: [], inprogress: [], done: [] };
    for (const col of COLUMNS) {
      const tasks = parsed[col.id];
      if (Array.isArray(tasks)) board[col.id] = tasks;
    }
    return board;
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
      // Ignore quota / serialization errors so the UI keeps working.
    }
  }, [board]);

  const addTask = useCallback((columnId: ColumnId, input: NewTaskInput) => {
    const task: Task = {
      id: crypto.randomUUID(),
      title: input.title.trim() || 'Untitled task',
      description: input.description.trim(),
      priority: input.priority,
      createdAt: Date.now(),
    };
    setBoard((prev) => ({ ...prev, [columnId]: [task, ...prev[columnId]] }));
  }, []);

  const updateTask = useCallback(
    (taskId: string, input: NewTaskInput) => {
      setBoard((prev) => {
        const next = {} as BoardState;
        for (const col of COLUMNS) {
          next[col.id] = prev[col.id].map((t) =>
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
        return next;
      });
    },
    [],
  );

  const deleteTask = useCallback((taskId: string) => {
    setBoard((prev) => {
      const next = {} as BoardState;
      for (const col of COLUMNS) {
        next[col.id] = prev[col.id].filter((t) => t.id !== taskId);
      }
      return next;
    });
  }, []);

  /** Move a task to `toColumn` at the given index, removing it from its old column. */
  const moveTask = useCallback(
    (taskId: string, toColumn: ColumnId, toIndex: number) => {
      setBoard((prev) => {
        let moving: Task | undefined;
        for (const col of COLUMNS) {
          const found = prev[col.id].find((t) => t.id === taskId);
          if (found) {
            moving = found;
            break;
          }
        }
        if (!moving) return prev;

        const next = {} as BoardState;
        for (const col of COLUMNS) {
          // Remove the task from wherever it currently lives.
          next[col.id] = prev[col.id].filter((t) => t.id !== taskId);
        }
        const target = [...next[toColumn]];
        const clamped = Math.max(0, Math.min(toIndex, target.length));
        target.splice(clamped, 0, moving);
        next[toColumn] = target;
        return next;
      });
    },
    [],
  );

  const resetBoard = useCallback(() => {
    setBoard(SEED_BOARD);
  }, []);

  return { board, addTask, updateTask, deleteTask, moveTask, resetBoard };
}
