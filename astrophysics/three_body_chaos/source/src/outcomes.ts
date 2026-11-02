// Outcome categories, labels, explanations and default colours.
import { OUT } from './simulate.ts';

export interface OutcomeInfo { code: number; short: string; label: string; explain: string }
export const OUTCOMES: OutcomeInfo[] = [
  { code: OUT.A_ESC, short: 'A escapes', label: 'A escapes; B–C remain bound', explain: 'Body A is unbound and moving away from a surviving B–C binary, under the documented escape criteria.' },
  { code: OUT.B_ESC, short: 'B escapes', label: 'B escapes; A–C remain bound', explain: 'Body B is unbound and moving away from a surviving A–C binary.' },
  { code: OUT.C_ESC, short: 'C escapes', label: 'C escapes; A–B remain bound', explain: 'Body C is unbound and moving away from a surviving A–B binary (includes simple fly-bys).' },
  { code: OUT.COL_AB, short: 'Collision A–B', label: 'Contact between A and B', explain: 'The distance between A and B reached the sum of their radii; the run stops at the located contact.' },
  { code: OUT.COL_AC, short: 'Collision A–C', label: 'Contact between A and C', explain: 'The distance between A and C reached the sum of their radii.' },
  { code: OUT.COL_BC, short: 'Collision B–C', label: 'Contact between B and C', explain: 'The distance between B and C reached the sum of their radii.' },
  { code: OUT.UNRESOLVED, short: 'Unresolved', label: 'Unresolved at the horizon', explain: 'Calculated, but no collision or accepted escape happened before the horizon. Not a proof of stability.' },
  { code: OUT.FAILED, short: 'Failed / unreliable', label: 'Numerical failure or unreliable', explain: 'Step underflow, excessive work, a singular encounter, an invalid start, or conservation error above the unreliable threshold.' },
  { code: OUT.DISRUPTION, short: 'Disruption', label: 'Complete disruption (no bound pair)', explain: 'All three pairs are unbound and separating: the system has dissolved with no surviving binary.' },
];
export const DEFAULT_OUTCOME_COLOURS = ['#e69f00', '#56b4e9', '#009e73', '#cc79a7', '#d55e00', '#0072b2', '#8d99ae', '#f8f9fa', '#f0e442'];
export const DEFAULT_BODY_COLOURS = ['#ff7b72', '#79c0ff', '#7ee787'];
export const BODY_NAMES = ['A', 'B', 'C'];

export interface Appearance { bodies: string[]; outcomes: string[]; showHatch: boolean; showPreview: boolean }
export const DEFAULT_APPEARANCE: Appearance = { bodies: [...DEFAULT_BODY_COLOURS], outcomes: [...DEFAULT_OUTCOME_COLOURS], showHatch: true, showPreview: true };

export function outcomeText(code: number, fail = 0): string {
  const o = OUTCOMES.find((x) => x.code === code);
  return o ? o.label : code === 255 ? 'Not yet calculated' : `outcome ${code}`;
}
