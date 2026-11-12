import { useEffect, useRef, useState } from 'react';

export interface Commit { value: number; message?: string }
interface Props {
  label: string; value: number; unit?: string; hint?: string;
  /** called on Enter / blur with the parsed finite number; returns the value actually stored and an optional explanation */
  onCommit: (v: number) => Commit;
  disabled?: boolean; readOnly?: boolean; width?: number; title?: string;
}

/** Format a number for display without losing information. */
export function fmt(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1e6 || a < 1e-4) return v.toExponential(6).replace(/\.?0+e/, 'e');
  return String(Number(v.toPrecision(12)));
}

/**
 * Buffered numeric input.  While focused the user edits free text (so "-", "1e-", "0." are all
 * allowed); the text is parsed on Enter or blur.  Invalid / non-finite text reverts to the previous
 * valid value with an explanation, and out-of-range numbers are clamped by the parent's onCommit.
 */
export function NumInput({ label, value, unit, hint, onCommit, disabled, readOnly, width, title }: Props) {
  const [text, setText] = useState(fmt(value));
  const [msg, setMsg] = useState('');
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setText(fmt(value)); }, [value]);
  const commit = () => {
    focused.current = false;
    const t = text.trim();
    const num = t === '' ? NaN : Number(t);
    if (!Number.isFinite(num)) { setText(fmt(value)); setMsg(`“${text}” is not a finite number; kept ${fmt(value)}.`); return; }
    const r = onCommit(num);
    setText(fmt(r.value)); setMsg(r.message ?? '');
  };
  return (
    <label className="num" title={title ?? hint}>
      <span className="num-l">{label}{unit ? <em> {unit}</em> : null}</span>
      <input type="text" inputMode="decimal" value={text} disabled={disabled} readOnly={readOnly} style={width ? { width } : undefined}
        className={msg ? 'warn' : ''}
        onFocus={() => { focused.current = true; }} onChange={(e) => { setText(e.target.value); setMsg(''); }}
        onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } else if (e.key === 'Escape') { setText(fmt(value)); setMsg(''); focused.current = false; (e.target as HTMLInputElement).blur(); } }} />
      {msg ? <span className="num-msg">{msg}</span> : null}
    </label>
  );
}
