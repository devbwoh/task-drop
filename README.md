# Task Drop Board

[![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Live_Demo-3178C6?style=for-the-badge&logo=github&logoColor=white)](https://devbwoh.github.io/task-drop/)


> **Drag, Drop, Done.**  
> Lightweight kanban board for organizing tasks.

---

## Features

- **Drag & Drop**: Move tasks between columns or reorder them within a column. Columns themselves are also draggable to rearrange the board layout.
- **Task Management**: Create, edit, and delete task cards with title, description, priority, and due date.
- **Column Management**: Add, rename, or delete columns dynamically.
- **Card Search**: Filter tasks across all columns by keyword in real time.
- **Board Reset**: One-click restore to the default layout.

---

## AI Configuration

- **VS code Extension**: Kilo code
- **Local AI Engine**: LM Studio
- **Model**: Qwen3.8 27B 

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Framework | React 19 (TypeScript) |
| Build | Vite |
| Package Manager | pnpm |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Styling | Tailwind CSS v4 |

---

## Getting Started

```bash
pnpm install
pnpm dev
```

Open the printed local URL in your browser.

### Production Build

```bash
pnpm build
pnpm preview
```
