import type { BoardState, Task } from './types';

const now = Date.now();
const day = 86_400_000;

function makeTask(
  id: string,
  title: string,
  description: string,
  priority: Task['priority'],
  daysAgo: number,
): Task {
  return { id, title, description, priority, createdAt: now - daysAgo * day };
}

export const SEED_BOARD: BoardState = {
  columns: [
    { id: 'todo', title: 'To Do' },
    { id: 'inprogress', title: 'In Progress' },
    { id: 'done', title: 'Done' },
  ],
  tasksByColumn: {
    todo: [
      makeTask(
        't1',
        'Design onboarding flow',
        'Sketch the first-run experience for new users. Cover empty states, a short product tour, and a clear call to action.',
        'high',
        2,
      ),
      makeTask(
        't2',
        'Write API documentation',
        'Document all public REST endpoints with request/response examples and error codes for the developer portal.',
        'medium',
        4,
      ),
      makeTask(
        't3',
        'Collect user feedback',
        'Send out a short survey to beta users and summarize the top five pain points into an action list.',
        'low',
        6,
      ),
    ],
    inprogress: [
      makeTask(
        't4',
        'Implement billing integration',
        'Wire up Stripe subscriptions, handle webhooks for upgrades/downgrades, and surface invoices in the dashboard.',
        'high',
        1,
      ),
      makeTask(
        't5',
        'Refactor auth middleware',
        'Split token validation from session handling so both can be tested independently. Add rate limiting on login.',
        'medium',
        3,
      ),
    ],
    done: [
      makeTask(
        't6',
        'Set up CI pipeline',
        'Configure automated linting, type-checking, and unit tests to run on every pull request with status checks.',
        'medium',
        8,
      ),
      makeTask(
        't7',
        'Fix mobile navigation bug',
        'The hamburger menu failed to close after selecting a route. Fixed the state reset and added a regression test.',
        'low',
        10,
      ),
    ],
  },
};
