/**
 * The background texture engine.
 *
 * A triangular lattice of hairline edges, of which a subset is drawn: the kagome (trihexagonal) tiling by default.
 * The lattice is stirred by learning dynamics: the replicator vector field of a rock–paper–scissors game, sampled
 * through a slowly drifting map whose offsets follow a Lorenz trajectory. Vertices integrate the field over scroll
 * distance (advection), relax back to rest on a weak spring, and are capped at 0.6 cell, so the lattice drifts like
 * something stirred rather than oscillating around rest. In the `full` variant the drawn edge set also changes along
 * the document, kagome → triangular → honeycomb, as a metamorphosis strip the viewport slides over.
 *
 * `staticLines` is the build-time frame (no JS, or reduced motion). `createTexture` runs the live layer on a canvas.
 * Nothing but the canvas and the scroll/resize listeners touch the DOM, so the engine can be reused elsewhere.
 */

export const PITCH = 72;
const SQ3 = Math.sqrt(3);
const TAU = Math.PI * 2;

/** Chosen line parity per family (rows, down-right, down-left). o2 ≠ o0 + o1 (mod 2) is what makes it a kagome:
 *  no vertex lies on all three chosen lines, so every drawn vertex has degree 4 and a quarter are hexagon centres. */
const CHOSEN = [1, 0, 0] as const;
/** The honeycomb keeps the edges not touching this vertex colour (vertices are 3-colourable). */
const HEX_COLOUR = 0;

/** Straight kagome lines at true scale for a region of w×h px, as one path `d`. Shares the lattice conventions
 *  below (a chosen row on y = 0), so the live layer can take over from it without a visible jump. */
export function staticLines(w: number, h: number, a = PITCH): string {
  const row = (a * SQ3) / 2;
  const run = h / SQ3; // horizontal travel of a 60° line over height h
  const f = (n: number) => String(Math.round(n * 10) / 10);
  let d = '';
  for (let y = 0; y <= h; y += 2 * row) d += `M0 ${f(y)}H${w}`;
  for (let x0 = -0.5 * a - Math.ceil(run / (2 * a)) * 2 * a; x0 <= w; x0 += 2 * a) d += `M${f(x0)} 0L${f(x0 + run)} ${f(h)}`;
  for (let x0 = 0.5 * a; x0 - run <= w; x0 += 2 * a) d += `M${f(x0)} 0L${f(x0 - run)} ${f(h)}`;
  return d;
}

export interface TextureOptions {
  /** `conservative`: kagome only. `full`: the edge set transforms along the document. */
  variant: 'conservative' | 'full';
  /** Slow wall-clock drift when nothing else is happening (one cycle per 120 s). */
  idle: boolean;
  pitch?: number;
}

declare global {
  interface Window {
    /** The live texture engine, when the layer is on, JS runs, and motion is allowed. */
    texture?: Texture;
  }
}

export interface Texture {
  /** Stir the lattice around a viewport point. `energy` 0–1; one unit twists about a third of a cell. */
  impulse(x: number, y: number, energy: number): void;
  /** 0–1. Mixes the stroke colour from the ink tint toward the accent tint (same contrast, different hue). */
  heat: number;
  /** Restart the frame loop (it idles when nothing is changing). */
  wake(): void;
  destroy(): void;
  /** Current mean and max vertex displacement, in cells. */
  readonly displacement: { mean: number; max: number };
}

// Tuning. Distances in CSS px, times in seconds, field magnitudes are ~0.2.
const FOLLOW_TAU = 0.22; // scroll follower time constant
const MAX_STEP = 40; // px of followed scroll applied per frame; bounds the stir from anchor jumps
const GAIN = 0.04; // px of displacement per px scrolled per unit field
const IDLE_GAIN = 1.2; // px/s per unit field while idling
const RELAX_TAU = 20; // spring back to rest
const CAP = 0.6; // max displacement, in cells
const WAVE = 10; // field wavelength, in cells (vortex cells are half that)
const PX_PER_LORENZ = 1300; // scroll px per unit of Lorenz time
const IDLE_LORENZ = 90; // seconds per unit of Lorenz time while idling
const IDLE_PERIOD = 120; // seconds per cycle of the idle offset
const IMPULSE_TAU = 0.9;
const IMPULSE_GAIN = 45; // px/s at unit energy
const SLOW_MS = 83; // tick interval when only slow processes are running (~12 fps)
const REST = 0.08; // residual displacement (cells) below which relaxation is invisible and the loop stops
const ALPHA_LEVELS = 12;

/**
 * The stirring field. Zero-sum RPS replicator dynamics conserve the product of the three strategy weights, so its
 * orbits are the level sets of ψ = p0·p1·p2. The plane is mapped onto the simplex through a quasi-periodic cosine map
 * and the flow is taken as the Hamiltonian field of ψ, (∂ψ/∂y, −∂ψ/∂x): the same streamlines as the replicator orbits,
 * but area-preserving, so the lattice shears and swirls without piling up. Writes the field into `out`.
 */
function field(x: number, y: number, lx: number, ly: number, du: number, dv: number, out: Float64Array): void {
  const su = 0.17, sv = -0.11; // shear terms that break the mirror symmetry of the cells
  const au = TAU * (x / lx + su * (y / ly) + du), av = TAU * (y / ly + sv * (x / lx) + dv);
  const u = 0.5 - 0.5 * Math.cos(au), v = 0.5 - 0.5 * Math.cos(av);
  const dux = (Math.PI / lx) * Math.sin(au), duy = su * (Math.PI / ly) * Math.sin(au);
  const dvy = (Math.PI / ly) * Math.sin(av), dvx = sv * (Math.PI / lx) * Math.sin(av);
  const pu = (1 - 2 * u) * (1 - v) * (1 - v) * v; // ∂ψ/∂u for ψ = u(1−u)(1−v)²v
  const pv = u * (1 - u) * (1 - v) * (1 - 3 * v); // ∂ψ/∂v
  const k = 1.6 * lx; // brings a typical magnitude to ~0.2
  out[0] = (pu * duy + pv * dvy) * k;
  out[1] = -(pu * dux + pv * dvx) * k;
}

const smooth = (a: number, b: number, x: number) => {
  const t = x <= a ? 0 : x >= b ? 1 : (x - a) / (b - a);
  return t * t * (3 - 2 * t);
};

export function createTexture(canvas: HTMLCanvasElement, opts: TextureOptions): Texture {
  const a = opts.pitch ?? PITCH;
  const row = (a * SQ3) / 2;
  const cap = CAP * a, cap2 = cap * cap;
  const lx = WAVE * a, ly = WAVE * row * 0.95;
  const ctx = canvas.getContext('2d')!;

  // Lattice
  let w = 0, hBuilt = 0, dpr = 1, cols = 0, rows = 0, n = 0, m = 0;
  let rx = new Float32Array(0), ry = rx, dx = rx, dy = rx; // rest and displacement per vertex
  let ea = new Int32Array(0), eb = ea; // edge endpoints
  let ek = new Uint8Array(0), eh = ek, bucket = ek; // kagome flag, honeycomb flag, alpha bucket
  let ey = new Float32Array(0); // edge midpoint rest y, for the structure phase
  let docH = 1;

  function build(): void {
    const oldCols = cols, oldRows = rows, oldDx = dx, oldDy = dy;
    w = innerWidth;
    hBuilt = Math.max(hBuilt, innerHeight + 160); // padded so the mobile URL bar does not force rebuilds
    dpr = Math.min(3, devicePixelRatio || 1);
    cols = Math.ceil(w / a) + 3;
    rows = Math.ceil(hBuilt / row) + 3;
    n = cols * rows;
    rx = new Float32Array(n); ry = new Float32Array(n); dx = new Float32Array(n); dy = new Float32Array(n);
    const A: number[] = [], B: number[] = [], K: number[] = [], H: number[] = [], Y: number[] = [];
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const v = j * cols + i;
        rx[v] = (i + (j & 1) * 0.5) * a - a;
        ry[v] = (j - 1) * row;
        if (i < oldCols && j < oldRows) { dx[v] = oldDx[j * oldCols + i]!; dy[v] = oldDy[j * oldCols + i]!; }
        const q = i - (j >> 1), r = j;
        const c = (((q - r) % 3) + 3) % 3;
        // Three edges per vertex: along the row, down-right, down-left. (family, line index, missing colour)
        const nb: [number, number, number, number, number][] = [
          [i + 1, j, 0, r, (c + 2) % 3],
          [i + (j & 1), j + 1, 1, q, (c + 1) % 3],
          [i - 1 + (j & 1), j + 1, 2, q + r, (c + 2) % 3],
        ];
        for (const [ni, nj, f, line, missing] of nb) {
          if (ni < 0 || ni >= cols || nj >= rows) continue;
          A.push(v); B.push(nj * cols + ni);
          K.push((line & 1) === CHOSEN[f] ? 1 : 0);
          H.push(missing === HEX_COLOUR ? 1 : 0);
          Y.push((ry[v]! + ry[nj * cols + ni]!) * 0.5);
        }
      }
    }
    m = A.length;
    ea = Int32Array.from(A); eb = Int32Array.from(B); ek = Uint8Array.from(K); eh = Uint8Array.from(H);
    ey = Float32Array.from(Y); bucket = new Uint8Array(m);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(hBuilt * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${hBuilt}px`;
    docH = document.documentElement.scrollHeight;
  }

  // Dynamics state
  let S = scrollY, sPrev = S, maxDisp = 0, heat = 0, colour = '';
  let lz0 = 1, lz1 = 1, lz2 = 20, pending = 0; // Lorenz state and un-integrated time
  let clock = 0; // idle wall-clock, s
  const f = new Float64Array(2);
  const impulses: { x: number; y: number; e: number; age: number }[] = [];
  let running = false, timer = 0, last = 0;

  function lorenz(units: number): void {
    pending += units;
    const dt = 0.01, s = 10, r = 28, b = 8 / 3;
    let steps = 0;
    while (pending >= dt && steps++ < 20) {
      const d = (x: number, y: number, z: number) => [s * (y - x), x * (r - z) - y, x * y - b * z] as const;
      const k1 = d(lz0, lz1, lz2);
      const k2 = d(lz0 + (dt / 2) * k1[0], lz1 + (dt / 2) * k1[1], lz2 + (dt / 2) * k1[2]);
      const k3 = d(lz0 + (dt / 2) * k2[0], lz1 + (dt / 2) * k2[1], lz2 + (dt / 2) * k2[2]);
      const k4 = d(lz0 + dt * k3[0], lz1 + dt * k3[1], lz2 + dt * k3[2]);
      lz0 += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]);
      lz1 += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
      lz2 += (dt / 6) * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]);
      pending -= dt;
    }
    if (steps >= 20) pending = 0;
  }

  function readColour(): void {
    canvas.style.color = `color-mix(in srgb, var(--texture-hot) ${Math.round(heat * 100)}%, var(--texture-cold))`;
    colour = getComputedStyle(canvas).color;
  }

  /** One step of the dynamics. Returns true if anything beyond slow relaxation is still moving. */
  function step(dt: number): boolean {
    const target = scrollY;
    S += (target - S) * (1 - Math.exp(-dt / FOLLOW_TAU));
    let dS = S - sPrev; sPrev = S;
    if (dS > MAX_STEP) dS = MAX_STEP; else if (dS < -MAX_STEP) dS = -MAX_STEP;
    const idle = opts.idle;
    if (idle) clock += dt;
    lorenz(Math.abs(dS) / PX_PER_LORENZ + (idle ? dt / IDLE_LORENZ : 0));
    const theta = (TAU * clock) / IDLE_PERIOD;
    const du = 0.15 * (lz0 / 20) + (idle ? 0.1 * Math.cos(theta) : 0);
    const dv = 0.15 * (lz2 / 50 - 0.5) + (idle ? 0.1 * Math.sin(theta) : 0);
    const gain = GAIN * dS + (idle ? IDLE_GAIN * dt : 0);
    const relax = 1 - Math.exp(-dt / RELAX_TAU);
    for (let k = impulses.length - 1; k >= 0; k--) {
      const p = impulses[k]!;
      p.age += dt;
      if (p.age > 6 * IMPULSE_TAU) impulses.splice(k, 1);
    }
    const R = 2 * a, R2 = 2 * R * R;
    let maxD2 = 0;
    for (let v = 0; v < n; v++) {
      let ddx = dx[v]!, ddy = dy[v]!;
      const x = rx[v]! + ddx, y = ry[v]! + ddy;
      let ax = 0, ay = 0;
      if (gain !== 0) {
        field(x, y, lx, ly, du, dv, f);
        ax = f[0]! * gain; ay = f[1]! * gain;
      }
      for (const p of impulses) {
        const ox = x - p.x, oy = y - p.y, d2 = ox * ox + oy * oy;
        if (d2 > 9 * R * R) continue;
        const s = (p.e * Math.exp(-p.age / IMPULSE_TAU) * Math.exp(-d2 / R2) * IMPULSE_GAIN * dt) / R;
        ax += (-oy + 0.3 * ox) * s; ay += (ox + 0.3 * oy) * s;
      }
      const soft = 1 - (0.6 * (ddx * ddx + ddy * ddy)) / cap2;
      ddx += ax * soft - ddx * relax;
      ddy += ay * soft - ddy * relax;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 > cap2) { const s = cap / Math.sqrt(d2); ddx *= s; ddy *= s; }
      if (d2 > maxD2) maxD2 = d2;
      dx[v] = ddx; dy[v] = ddy;
    }
    maxDisp = Math.sqrt(maxD2);
    return Math.abs(target - S) > 0.1 || Math.abs(dS) > 0.05 || impulses.length > 0;
  }

  function render(): void {
    const full = opts.variant === 'full';
    for (let e = 0; e < m; e++) {
      let alpha: number;
      if (full) {
        const phi = (S + ey[e]!) / docH;
        const kt = smooth(0.22, 0.4, phi), th = smooth(0.62, 0.8, phi);
        alpha = (1 - kt) * ek[e]! + kt * (1 - th) + th * eh[e]!;
        if (alpha > 1) alpha = 1;
      } else alpha = ek[e]!;
      bucket[e] = alpha < 0.04 ? 255 : Math.round(alpha * (ALPHA_LEVELS - 1));
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hBuilt);
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.strokeStyle = colour;
    for (let b = 0; b < ALPHA_LEVELS; b++) {
      let any = false;
      ctx.beginPath();
      for (let e = 0; e < m; e++) {
        if (bucket[e] !== b) continue;
        any = true;
        const p = ea[e]!, q = eb[e]!;
        ctx.moveTo(rx[p]! + dx[p]!, ry[p]! + dy[p]!);
        ctx.lineTo(rx[q]! + dx[q]!, ry[q]! + dy[q]!);
      }
      if (!any) continue;
      ctx.globalAlpha = b / (ALPHA_LEVELS - 1);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /** Full rate while input or impulses are live; a slow timer while only relaxation or idle drift is moving
   *  anything; nothing at all otherwise. */
  function tick(now: number): void {
    if (!running) return;
    const dt = Math.min(0.12, Math.max(0.001, (now - last) / 1000));
    last = now;
    const active = step(dt);
    render();
    if (active) requestAnimationFrame(tick);
    else if (opts.idle || maxDisp > REST * a) timer = setTimeout(() => { timer = 0; requestAnimationFrame(tick); }, SLOW_MS);
    else running = false; // relaxed to within REST of rest: nothing visible is changing, so stop
  }

  function wake(): void {
    docH = document.documentElement.scrollHeight;
    if (timer) { clearTimeout(timer); timer = 0; requestAnimationFrame(tick); return; }
    if (running) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(tick);
  }

  function onResize(): void {
    if (innerWidth !== w || innerHeight > hBuilt || Math.min(3, devicePixelRatio || 1) !== dpr) build();
    wake();
  }

  const scheme = matchMedia('(prefers-color-scheme: dark)');
  const onScheme = () => { readColour(); wake(); };
  addEventListener('scroll', wake, { passive: true });
  addEventListener('resize', onResize, { passive: true });
  scheme.addEventListener('change', onScheme);

  build();
  readColour();
  render();
  wake();

  return {
    impulse(x, y, energy) {
      impulses.push({ x, y, e: Math.min(1, Math.max(0, energy)), age: 0 });
      wake();
    },
    get heat() { return heat; },
    set heat(h: number) { heat = Math.min(1, Math.max(0, h)); readColour(); wake(); },
    wake,
    get displacement() {
      let sum = 0, max = 0;
      for (let v = 0; v < n; v++) { const d = Math.hypot(dx[v]!, dy[v]!); sum += d; if (d > max) max = d; }
      return { mean: sum / (n || 1) / a, max: max / a };
    },
    destroy() {
      running = false;
      clearTimeout(timer);
      removeEventListener('scroll', wake);
      removeEventListener('resize', onResize);
      scheme.removeEventListener('change', onScheme);
      canvas.remove();
    },
  };
}
