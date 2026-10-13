/**
 * The easter egg. Nothing on the page imports this module: src/components/Egg.astro loads it on the first trigger
 * step (a hover or tap on the node after the name, or the first ↑ of the code), and calls `toggle`.
 *
 * The texture is the egg. A trigger launches a shock in the lattice through the engine API (`window.texture.shock`):
 * vertices scatter along the dynamics field, edges flash through a hue cycle, and the lattice cools back to the
 * hairline over about six seconds. A particle layer sits on top (shards, shockwave rings, a flash), and the guests
 * are the research objects behind the page, drawn here as hue-cycled SVG strokes: a Lorenz butterfly tracing itself
 * live across the screen, a Chua double scroll phasing in and out like a ghost, a school of rock–paper–scissors
 * replicator orbits, and two gradient learners in a bilinear game, one spiralling out of the equilibrium and one in.
 * Every curve is integrated here; nothing is drawn from a file.
 *
 * Rules it plays by, so that a toy costs the page nothing:
 *   - The layer is `position: fixed; inset: 0` and therefore `pointer-events: none`. The one clickable thing, the
 *     "Put it away" link, is a separate element outside it.
 *   - Every particle and guest removes itself when its animation finishes, so nothing accumulates.
 *   - Every requestAnimationFrame loop has a deadline and stops the moment the show ends.
 *   - `prefers-reduced-motion` gets a short, calm bloom: no shock, no guests.
 *   - It imports nothing at runtime and reads nothing but the viewport and `window.texture`.
 */
import type { Texture } from './texture';

export type Guest = 'lorenz' | 'chua' | 'rps' | 'spiral';
export const GUESTS: readonly Guest[] = ['lorenz', 'chua', 'rps', 'spiral'];

export interface Options {
  /** Viewport point the shock starts from; the viewport centre otherwise. */
  at?: readonly [number, number];
  /** Which guests appear. All of them, staggered, by default. */
  guests?: readonly Guest[];
  /** Called when the viewer clicks "Put it away". */
  onOff?: () => void;
}

interface Show {
  alive: boolean;
  layer: HTMLDivElement;
  off: HTMLAnchorElement | null;
  svg: SVGSVGElement;
  timers: number[];
  tex: Texture | undefined;
}

const SVG = 'http://www.w3.org/2000/svg';
const SHOW_MS = 8000;
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!;
const dark = () => matchMedia('(prefers-color-scheme: dark)').matches;
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const hsl = (h: number) => `hsl(${Math.round(((h % 360) + 360) % 360)} 90% ${dark() ? 64 : 48}%)`;

const CSS = `
.egg{position:fixed;inset:0;z-index:2;pointer-events:none;overflow:hidden;contain:layout paint}
.egg>svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.egg path{fill:none;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.egg i{position:absolute;display:block;will-change:transform,opacity;transform:translate(-50%,-50%)}
.egg .wave{border-radius:50%}
.egg .flash{left:0;top:0;width:100%;height:100%;transform:none}
.egg-off{position:fixed;right:1.25rem;bottom:1rem;z-index:3;padding:.2rem .5rem;background:var(--bg);font-size:.9375rem;color:var(--ink-2);text-decoration-color:var(--accent)}`;

let show: Show | null = null;

const later = (st: Show, ms: number, fn: () => void): void => {
  st.timers.push(window.setTimeout(() => { if (st.alive) fn(); }, ms));
};
const cleanup = (el: Element, a: Animation): void => { a.onfinish = a.oncancel = () => el.remove(); };

/** A frame loop with a deadline; it also stops when the show ends. */
function loop(st: Show, life: number, fn: (dt: number) => void, done: () => void): void {
  const t0 = performance.now();
  let last = t0;
  const tick = (now: number) => {
    if (!st.alive) return;
    fn(Math.min(0.05, (now - last) / 1000));
    last = now;
    if (now - t0 < life) requestAnimationFrame(tick); else done();
  };
  requestAnimationFrame(tick);
}

type V3 = [number, number, number];
/** One midpoint step of a 3-d flow. */
function rk2(p: V3, f: (p: V3) => V3, h: number): void {
  const k = f(p);
  const q = f([p[0] + 0.5 * h * k[0], p[1] + 0.5 * h * k[1], p[2] + 0.5 * h * k[2]]);
  p[0] += h * q[0]; p[1] += h * q[1]; p[2] += h * q[2];
}

// ---------------------------------------------------------------------------------------------------------- particles
const SHAPES = ['polygon(50% 0,100% 100%,0 100%)', 'polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)', 'polygon(50% 0,100% 50%,50% 100%,0 50%)'];
const EASES = ['cubic-bezier(.12,.7,.25,1)', 'cubic-bezier(.2,.9,.3,1)', 'cubic-bezier(.08,.85,.2,1)', 'ease-out'];
type Flavour = 'bloom' | 'spiral' | 'fountain' | 'vortex';

function shard(st: Show, x: number, y: number, dx: number, dy: number, hue: number, size: number, spin: number, dur: number): void {
  const el = document.createElement('i');
  const c = hsl(hue);
  if (Math.random() < 0.25) { el.style.border = `${rand(1.5, 3).toFixed(1)}px solid ${c}`; el.style.borderRadius = '50%'; }
  else { el.style.background = c; el.style.clipPath = pick(SHAPES); }
  el.style.left = `${x}px`; el.style.top = `${y}px`; el.style.width = `${size}px`; el.style.height = `${size}px`; el.style.opacity = '0';
  st.layer.append(el);
  cleanup(el, el.animate([
    { transform: 'translate(-50%,-50%) rotate(0) scale(.2)', opacity: 0 },
    { transform: `translate(calc(-50% + ${dx * 0.35}px),calc(-50% + ${dy * 0.35}px)) rotate(${spin * 0.35}deg) scale(1)`, opacity: rand(0.7, 1), offset: 0.25 },
    { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(${spin}deg) scale(${rand(0.3, 1).toFixed(2)})`, opacity: 0 },
  ], { duration: dur, easing: pick(EASES), fill: 'forwards' }));
}

function wave(st: Show, x: number, y: number, hue: number, to: number): void {
  const el = document.createElement('i');
  el.className = 'wave';
  el.style.left = `${x}px`; el.style.top = `${y}px`;
  el.style.border = `${rand(1.5, 3).toFixed(1)}px solid ${hsl(hue)}`;
  st.layer.append(el);
  cleanup(el, el.animate([{ width: '8px', height: '8px', opacity: 0.9 }, { width: `${to}px`, height: `${to}px`, opacity: 0 }],
    { duration: rand(900, 1700), easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'forwards' }));
}

function flash(st: Show, hue: number): void {
  const el = document.createElement('i');
  el.className = 'flash';
  el.style.background = hsl(hue);
  st.layer.append(el);
  cleanup(el, el.animate([{ opacity: 0 }, { opacity: 0.45, offset: 0.08 }, { opacity: 0 }], { duration: 620, easing: 'ease-out', fill: 'forwards' }));
}

function vector(fl: Flavour, t: number, spread: number): [number, number] {
  switch (fl) {
    case 'spiral': { const a = t * Math.PI * rand(4, 8), r = spread * (0.25 + t * 0.85); return [Math.cos(a) * r, Math.sin(a) * r]; }
    case 'fountain': { const a = -Math.PI / 2 + rand(-0.7, 0.7), r = spread * rand(0.5, 1.1); return [Math.cos(a) * r, Math.sin(a) * r + spread * 0.45]; }
    case 'vortex': { const a = t * 2 * Math.PI + rand(-0.3, 0.3), r = spread * rand(0.8, 1.15); return [Math.cos(a) * r * 1.35, Math.sin(a) * r * 0.55]; }
    default: { const a = t * 2 * Math.PI + rand(-0.25, 0.25), r = spread * rand(0.4, 1.15); return [Math.cos(a) * r, Math.sin(a) * r]; }
  }
}

/** Scaled to the viewport. `calm` is the reduced-motion bloom: ten small shards, nothing else. */
function burst(st: Show, x: number, y: number, calm: boolean): void {
  const diag = Math.hypot(innerWidth, innerHeight);
  const base = rand(0, 360);
  const n = calm ? 10 : Math.round(rand(70, 120));
  const spread = calm ? 90 : diag * rand(0.5, 0.85);
  const fl: Flavour = calm ? 'bloom' : pick(['bloom', 'spiral', 'fountain', 'vortex']);
  if (!calm) {
    flash(st, base);
    const waves = Math.round(rand(2, 4));
    for (let i = 0; i < waves; i++) later(st, i * rand(80, 160), () => wave(st, x, y, base + i * 40, diag * rand(0.9, 1.6)));
  }
  for (let i = 0; i < n; i++) {
    const [dx, dy] = vector(fl, i / n, spread);
    shard(st, x, y, dx, dy, base + (i / n) * 360, calm ? rand(8, 18) : rand(8, 44), calm ? 40 : rand(-900, 900), calm ? rand(500, 900) : rand(900, 2600));
  }
}

// ------------------------------------------------------------------------------------------------------------- guests
/** A group whose hue cycles for `life` ms. */
function group(st: Show, cycle: number, life: number): SVGGElement {
  const g = document.createElementNS(SVG, 'g');
  st.svg.append(g);
  g.animate([{ filter: 'hue-rotate(0deg)' }, { filter: 'hue-rotate(360deg)' }], { duration: cycle, iterations: Math.ceil(life / cycle) + 1 });
  return g;
}
function stroke(g: SVGGElement, hue: number, width: number, d = ''): SVGPathElement {
  const p = document.createElementNS(SVG, 'path');
  p.setAttribute('stroke', hsl(hue));
  p.setAttribute('stroke-width', String(width));
  if (d) p.setAttribute('d', d);
  g.append(p);
  return p;
}
const fade = (el: Element, ms: number): void => cleanup(el, el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'ease-in', fill: 'forwards' }));

/** The Lorenz butterfly, traced live (σ 10, ρ 28, β 8/3, the (x, z) plane) while it drifts across the screen. */
function lorenz(st: Show): void {
  const vw = innerWidth, vh = innerHeight, s = (Math.min(vw, vh) * 0.72) / 50, life = 5200;
  const g = group(st, 3000, life + 900);
  const y0 = rand(vh * 0.3, vh * 0.7), dir = Math.random() < 0.5 ? 1 : -1;
  const xa = vw / 2 - dir * vw * 0.22, xb = vw / 2 + dir * vw * 0.22;
  g.style.transform = `translate(${xa}px, ${y0}px)`;
  g.animate([{ transform: `translate(${xa}px, ${y0}px)` }, { transform: `translate(${xb}px, ${y0 - 20}px)` }], { duration: life + 900, easing: 'ease-in-out', fill: 'forwards' });
  const p: V3 = [rand(0.5, 1.5), 1, 20];
  const f = (q: V3): V3 => [10 * (q[1] - q[0]), q[0] * (28 - q[2]) - q[1], q[0] * q[1] - (8 / 3) * q[2]];
  for (let i = 0; i < 400; i++) rk2(p, f, 0.005); // burn in, onto the attractor
  const pt = () => `${(p[0] * s * 1.3).toFixed(1)} ${((25 - p[2]) * s).toFixed(1)}`;
  let hue = rand(0, 360), seg = stroke(g, hue, 1.4), d = 'M' + pt(), count = 0;
  loop(st, life, (dt) => {
    for (let units = 3.2 * dt; units > 0; units -= 0.004) {
      rk2(p, f, 0.004);
      d += 'L' + pt();
      if (++count % 90 === 0) { seg.setAttribute('d', d); hue += 20; seg = stroke(g, hue, 1.4); d = 'M' + pt(); }
    }
    seg.setAttribute('d', d);
  }, () => fade(g, 900));
}

/** Chua's circuit (α 15.6, β 28, m₀ −1.143, m₁ −0.714), the double scroll in the (x, z) plane, in a unit box. */
let chuaD = '';
function chuaPath(): string {
  if (chuaD) return chuaD;
  const a = 15.6, b = 28, m0 = -1.143, m1 = -0.714;
  const f = (q: V3): V3 => [a * (q[1] - q[0] - (m1 * q[0] + 0.5 * (m0 - m1) * (Math.abs(q[0] + 1) - Math.abs(q[0] - 1)))), q[0] - q[1] + q[2], -b * q[1]];
  const p: V3 = [0.7, 0, 0];
  for (let i = 0; i < 2000; i++) rk2(p, f, 0.005);
  let d = '';
  for (let i = 0; i < 7000; i++) { rk2(p, f, 0.005); if (i % 2 === 0) d += (d ? 'L' : 'M') + (p[0] * 0.38).toFixed(3) + ' ' + (p[2] * 0.26).toFixed(3); }
  return (chuaD = d);
}

/** The double scroll as a ghost: it phases in somewhere, throws two after-images, and sinks away. Four to six times. */
function chua(st: Show): void {
  const vw = innerWidth, vh = innerHeight, d = chuaPath(), k = Math.round(rand(4, 6));
  for (let i = 0; i < k; i++) {
    const size = rand(0.3, 0.55) * Math.min(vw, vh), x = rand(size * 0.6, vw - size * 0.6), y = rand(size * 0.4, vh - size * 0.4);
    const dur = rand(1500, 2100), hue = rand(0, 360);
    const at = (dy: number, sc: number) => `translate(${x}px, ${y + dy}px) scale(${(size / 2) * sc})`;
    later(st, i * rand(520, 820), () => {
      const g = group(st, 2000, dur);
      stroke(g, hue, 1.2, d);
      g.style.opacity = '0';
      cleanup(g, g.animate([
        { opacity: 0, transform: at(30, 0.85) },
        { opacity: 0.9, transform: at(0, 1), offset: 0.3 },
        { opacity: 0.9, transform: at(0, 1), offset: 0.68 },
        { opacity: 0, transform: at(-40, 1.15) },
      ], { duration: dur, easing: 'ease-in-out', fill: 'forwards' }));
      for (let j = 0; j < 2; j++) {
        const e = group(st, 2000, dur);
        stroke(e, hue + 40 * (j + 1), 1, d);
        e.style.opacity = '0';
        cleanup(e, e.animate([{ opacity: 0.45, transform: at(0, 1) }, { opacity: 0, transform: `translate(${x + rand(-100, 100)}px, ${y + rand(-80, 80)}px) scale(${(size / 2) * rand(1.2, 1.7)})` }],
          { duration: rand(700, 1200), delay: 260 + j * 120, easing: 'ease-out', fill: 'forwards' }));
      }
      later(st, 300, () => { st.tex?.impulse(x, y, 0.8); wave(st, x, y, hue, size * 1.6); });
    });
  }
}

/** One closed orbit of the zero-sum rock–paper–scissors replicator, starting `r` from the centre of the simplex,
 *  drawn in the simplex's triangle (paper right, scissors top), centred, about two units across. */
function orbit(r: number): string {
  const p: V3 = [1 / 3 + r, 1 / 3 - r / 2, 1 / 3 - r / 2];
  const f = (q: V3): V3 => [q[0] * (q[2] - q[1]), q[1] * (q[0] - q[2]), q[2] * (q[1] - q[0])];
  const pt = (q: V3) => `${((q[1] + q[2] / 2 - 0.5) * 2).toFixed(3)} ${((0.2887 - q[2] * 0.866) * 2).toFixed(3)}`;
  const x0 = p[0], y0 = p[1];
  let d = 'M' + pt(p);
  for (let i = 0; i < 3000; i++) {
    rk2(p, f, 0.03);
    d += 'L' + pt(p);
    if (i > 100 && Math.hypot(p[0] - x0, p[1] - y0) < 0.012) break;
  }
  return d + 'Z';
}

/** A school of replicator orbits swims across. Heavy-tailed: mostly six to a dozen, now and then thirty. */
function school(st: Show): void {
  const vw = innerWidth, vh = innerHeight;
  const n = Math.min(30, Math.max(6, Math.ceil(6 * Math.pow(1 - Math.random(), -0.75))));
  const crowd = Math.min(1, 10 / Math.max(10, n)), dir = Math.random() < 0.5 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const size = rand(30, 70) * (0.6 + 0.4 * crowd) * rand(0.8, 1.3), life = rand(3200, 5200), delay = i * rand(40, 120);
    const g = group(st, 2400, life + delay);
    const p = stroke(g, rand(0, 360), 1.5, orbit(rand(0.05, 0.5)));
    p.setAttribute('stroke-dasharray', '.45 .25');
    p.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -7 }], { duration: 1400, iterations: Math.ceil((life + delay) / 1400) + 1 });
    const x0 = dir > 0 ? -size * 2 : vw + size * 2, x1 = dir > 0 ? vw + size * 2 : -size * 2;
    const at = (x: number, y: number) => `translate(${x}px, ${y}px) scale(${size})`;
    let y = rand(vh * 0.1, vh * 0.9);
    g.style.transform = at(x0, y);
    const frames = [{ transform: at(x0, y), offset: 0 }];
    for (let k = 1; k <= 3; k++) {
      y = Math.max(20, Math.min(vh - 20, y + rand(-vh * 0.25, vh * 0.25)));
      frames.push({ transform: at(x0 + ((x1 - x0) * k) / 3, y), offset: k / 3 });
    }
    cleanup(g, g.animate(frames, { duration: life, delay, easing: 'linear', fill: 'forwards' }));
  }
}

/** Two gradient learners in the bilinear game x·y, traced live from the same equilibrium: simultaneous gradient play
 *  spirals out of it (the instability), optimistic gradient play spirals in (the stable fixed point). */
function spiral(st: Show): void {
  const vw = innerWidth, vh = innerHeight, R = Math.min(vw, vh) * 0.4, life = 4200, eta = 0.14;
  const g = group(st, 3000, life + 900);
  g.style.transform = `translate(${rand(vw * 0.3, vw * 0.7)}px, ${rand(vh * 0.3, vh * 0.7)}px)`;
  let ax = 3, ay = 0, bx = R * 0.9, by = 0, px = bx, py = by;
  let da = `M${ax} ${ay}`, db = `M${bx.toFixed(1)} ${by}`;
  const out = stroke(g, rand(0, 360), 1.5), inn = stroke(g, rand(0, 360), 1.5);
  loop(st, life, (dt) => {
    for (let steps = Math.round(120 * dt); steps > 0; steps--) {
      if (Math.hypot(ax, ay) < R) { const nx = ax - eta * ay, ny = ay + eta * ax; ax = nx; ay = ny; da += `L${ax.toFixed(1)} ${ay.toFixed(1)}`; }
      if (Math.hypot(bx, by) > 2) { const nx = bx - eta * (2 * by - py), ny = by + eta * (2 * bx - px); px = bx; py = by; bx = nx; by = ny; db += `L${bx.toFixed(1)} ${by.toFixed(1)}`; }
    }
    out.setAttribute('d', da); inn.setAttribute('d', db);
  }, () => fade(g, 900));
}

const RUN: Record<Guest, (st: Show) => void> = { lorenz, chua, rps: school, spiral };
const ENTRANCES: readonly [Guest, number][] = [['lorenz', 250], ['rps', 700], ['chua', 1100], ['spiral', 1600]];

// --------------------------------------------------------------------------------------------------------------- show
const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') end(); };

/** Start the show (ending one already running). */
export function start(opts: Options = {}): void {
  end();
  if (!document.getElementById('egg-css')) {
    const style = document.createElement('style');
    style.id = 'egg-css';
    style.textContent = CSS;
    document.head.append(style);
  }
  const layer = document.createElement('div');
  layer.className = 'egg';
  layer.setAttribute('aria-hidden', 'true');
  layer.style.mixBlendMode = dark() ? 'screen' : 'multiply';
  const svg = document.createElementNS(SVG, 'svg');
  layer.append(svg);
  document.body.append(layer);
  const st: Show = { alive: true, layer, off: null, svg, timers: [], tex: window.texture };
  show = st;
  const calm = reduced();
  const [x, y] = opts.at ?? [innerWidth / 2, innerHeight / 2];
  if (!calm) st.tex?.shock(x, y, 1);
  burst(st, x, y, calm);
  if (!calm) {
    const guests = opts.guests ?? GUESTS;
    for (const [name, at] of ENTRANCES) if (guests.includes(name)) later(st, guests.length > 1 ? at : 250, () => RUN[name](st));
    const off = document.createElement('a');
    off.className = 'egg-off';
    off.href = '#';
    off.textContent = 'Put it away';
    off.addEventListener('click', (e) => { e.preventDefault(); opts.onOff?.(); end(); });
    document.body.append(off);
    st.off = off;
  }
  addEventListener('keydown', onKey);
  later(st, calm ? 1200 : SHOW_MS, end);
}

/** End the show: the lattice settles, the layer fades and is removed, every loop stops. */
export function end(): void {
  const st = show;
  if (!st) return;
  show = null;
  st.alive = false;
  for (const t of st.timers) clearTimeout(t);
  removeEventListener('keydown', onKey);
  st.tex?.settle();
  st.off?.remove();
  cleanup(st.layer, st.layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: 'ease-in', fill: 'forwards' }));
}

/** The trigger: a show starts, or the running one ends. Returns true when a show started. */
export function toggle(at: readonly [number, number], onOff?: () => void): boolean {
  if (show) { end(); return false; }
  start({ at, onOff });
  return true;
}

declare global {
  interface Window {
    /** The egg, once loaded; for scripting and review. */
    egg?: { start: typeof start; end: typeof end; toggle: typeof toggle; readonly running: boolean };
  }
}
window.egg = { start, end, toggle, get running() { return show !== null; } };
