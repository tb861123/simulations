import { useEffect, useReducer } from 'react';
import type { Lab } from '../lab.ts';

/** Re-render when any of the listed lab topics change. */
export function useLab(lab: Lab, topics: string[]): void {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => lab.subscribe((t) => { for (const x of topics) if (t.has(x)) { bump(); return; } }), [lab, topics.join('|')]);
}
