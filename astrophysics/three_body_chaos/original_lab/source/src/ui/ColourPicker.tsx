import { useEffect, useRef, useState } from 'react';
import { hsvToRgb, normaliseHex, parseChannel, parseHex, rgbToHsv, toHex, type RGB } from '../colours.ts';

/** Colour swatch that opens a popup: clickable hue/saturation spectrum, brightness slider, Hex field and R/G/B fields (0-255). */
export function ColourPicker({ value, onChange, label }: { value: string; onChange: (hex: string) => void; label: string }) {
  const [open, setOpen] = useState(false);
  const cur = parseHex(value) ?? [128, 128, 128];
  const [hsv, setHsv] = useState(rgbToHsv(cur));
  const [hex, setHex] = useState(value);
  const [rgbT, setRgbT] = useState(cur.map(String));
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c = parseHex(value) ?? [128, 128, 128]; setHex(value); setRgbT(c.map(String)); setHsv(rgbToHsv(c)); }, [value]);
  useEffect(() => {
    if (!open || !cv.current) return;
    const ctx = cv.current.getContext('2d')!, W = cv.current.width, H = cv.current.height, img = ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const [r, g, b] = hsvToRgb((x / W) * 360, 1 - y / H, hsv[2]); const k = 4 * (y * W + x); img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255; }
    ctx.putImageData(img, 0, 0);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc((hsv[0] / 360) * W, (1 - hsv[1]) * H, 6, 0, 2 * Math.PI); ctx.stroke();
  }, [open, hsv]);
  const apply = (c: RGB, h?: [number, number, number]) => { const hx = toHex(c); setHex(hx); setRgbT(c.map(String)); if (h) setHsv(h); onChange(hx); };
  const pick = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const h = Math.min(359.9, Math.max(0, ((e.clientX - r.left) / r.width) * 360)), s = Math.min(1, Math.max(0, 1 - (e.clientY - r.top) / r.height));
    apply(hsvToRgb(h, s, hsv[2]), [h, s, hsv[2]]);
  };
  return (
    <span className="cpick">
      <button type="button" className="swatch" style={{ background: value }} aria-label={`Choose colour: ${label}`} title={`${label}: ${value}`} onClick={() => setOpen(!open)} />
      {open ? (
        <div className="cpop" role="dialog" aria-label={`Colour for ${label}`}>
          <canvas ref={cv} width={220} height={130} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pick(e); }} onPointerMove={(e) => { if (e.buttons) pick(e); }} />
          <label className="row">Brightness
            <input type="range" min={0.05} max={1} step={0.01} value={hsv[2]} onChange={(e) => { const v = +e.target.value; apply(hsvToRgb(hsv[0], hsv[1], v), [hsv[0], hsv[1], v]); }} />
          </label>
          <label className="row">Hex
            <input type="text" value={hex} spellCheck={false} onChange={(e) => setHex(e.target.value)}
              onBlur={() => { const n = normaliseHex(hex); if (n) apply(parseHex(n)!); else setHex(value); }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
          </label>
          <div className="row">RGB
            {[0, 1, 2].map((k) => (
              <input key={k} type="text" inputMode="numeric" className="rgb" value={rgbT[k]} aria-label={'RGB ' + 'RGB'[k]}
                onChange={(e) => { const t = [...rgbT]; t[k] = e.target.value; setRgbT(t); }}
                onBlur={() => { const ch = rgbT.map((t) => parseChannel(t)); if (ch.every((c) => c !== null)) apply(ch as RGB); else setRgbT(parseHex(value)!.map(String)); }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} />
            ))}
          </div>
          <button type="button" className="small" onClick={() => setOpen(false)}>Done</button>
        </div>
      ) : null}
    </span>
  );
}
