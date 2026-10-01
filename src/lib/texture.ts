/**
 * The background texture: a trihexagonal (kagome) tessellation of hairlines whose vertices are displaced
 * by the replicator-dynamics vector field of a rock–paper–scissors game. The field is sampled at a point
 * that drifts along a Lorenz trajectory as the page scrolls, so the warp advances smoothly and never repeats.
 * Shared by the build-time static frame and the client script.
 */

export interface Frame {
  /** One `d` string per polyline; three families of lines. */
  paths: string[];
}

const SQ3 = Math.sqrt(3);

/** Replicator dynamics on the RPS simplex, payoff A with a slight win bonus so orbits are not closed. */
function rps(x0: number, x1: number, x2: number): [number, number, number] {
  const e = 0.15;
  const a0 = -x1 + (1 + e) * x2;
  const a1 = (1 + e) * x0 - x2;
  const a2 = -x0 + (1 + e) * x1;
  const avg = x0 * a0 + x1 * a1 + x2 * a2;
  return [x0 * (a0 - avg), x1 * (a1 - avg), x2 * (a2 - avg)];
}

/** Lorenz state after integrating from a fixed seed for `time` units (RK4, dt 0.01). */
export function lorenzAt(time: number): [number, number, number] {
  let x = 1, y = 1, z = 20;
  const s = 10, r = 28, b = 8 / 3, dt = 0.01;
  const f = (x: number, y: number, z: number) => [s * (y - x), x * (r - z) - y, x * y - b * z];
  const n = Math.max(0, Math.round(time / dt));
  for (let i = 0; i < n; i++) {
    const k1 = f(x, y, z);
    const k2 = f(x + (dt / 2) * k1[0]!, y + (dt / 2) * k1[1]!, z + (dt / 2) * k1[2]!);
    const k3 = f(x + (dt / 2) * k2[0]!, y + (dt / 2) * k2[1]!, z + (dt / 2) * k2[2]!);
    const k4 = f(x + dt * k3[0]!, y + dt * k3[1]!, z + dt * k3[2]!);
    x += (dt / 6) * (k1[0]! + 2 * k2[0]! + 2 * k3[0]! + k4[0]!);
    y += (dt / 6) * (k1[1]! + 2 * k2[1]! + 2 * k3[1]! + k4[1]!);
    z += (dt / 6) * (k1[2]! + 2 * k2[2]! + 2 * k3[2]! + k4[2]!);
  }
  return [x, y, z];
}

/**
 * Build the frame for a viewport of w×h at phase t ∈ [0, 1].
 * `spacing` is the lattice pitch in px; `amp` the displacement amplitude in px.
 */
export function buildFrame(w: number, h: number, t: number, spacing = 72, amp = 10): Frame {
  const [lx, , lz] = lorenzAt(t * 24);
  // Drift of the sampling point across the simplex, from the Lorenz state (|x| ≲ 20, z ∈ [0, 50]).
  const du = 0.18 * (lx / 20);
  const dv = 0.18 * (lz / 50 - 0.5);

  const rowH = (spacing * SQ3) / 2;
  const cols = Math.ceil(w / spacing) + 3;
  const rows = Math.ceil(h / rowH) + 3;

  // Lattice vertex (i, j) → displaced position.
  const pos = (i: number, j: number): [number, number] => {
    const x = (i + (j % 2 ? 0.5 : 0)) * spacing - spacing;
    const y = j * rowH - rowH;
    // Map to barycentric coordinates on the simplex, shifted by the drift, and read the field there.
    // The cosine map is periodic and smooth, so the field tiles across the viewport with no seam.
    const u = 0.5 - 0.5 * Math.cos(2 * Math.PI * (x / w + du));
    const v = 0.5 - 0.5 * Math.cos(2 * Math.PI * (y / h + dv));
    const p0 = u * (1 - v), p1 = (1 - u) * (1 - v), p2 = v;
    const [f0, f1, f2] = rps(p0, p1, p2);
    // Project the 3-vector onto the simplex plane.
    const dx = (f0 - f1) * SQ3 * 0.5;
    const dy = f2 - (f0 + f1) * 0.5;
    const k = amp * 6; // field magnitudes are ~0.1
    return [x + dx * k, y + dy * k];
  };

  const r = (n: number) => Math.round(n);
  const line = (pts: [number, number][]) => {
    if (pts.length < 2) return '';
    let d = `M${r(pts[0]![0])} ${r(pts[0]![1])}`;
    for (let k = 1; k < pts.length; k++) d += `L${r(pts[k]![0])} ${r(pts[k]![1])}`;
    return d;
  };

  const paths: string[] = [];
  // Family 1: rows. Kagome: skip every other row so hexagons open up between the triangles.
  for (let j = 0; j < rows; j += 2) {
    const pts: [number, number][] = [];
    for (let i = 0; i < cols; i++) pts.push(pos(i, j));
    paths.push(line(pts));
  }
  // Families 2 and 3: the two diagonal directions, again every other line.
  for (let s = -rows; s < cols + rows; s += 2) {
    const a: [number, number][] = [], b: [number, number][] = [];
    for (let j = 0; j < rows; j++) {
      const i1 = s + Math.floor(j / 2); // down-right
      const i2 = s - Math.ceil(j / 2); // down-left
      if (i1 >= 0 && i1 < cols) a.push(pos(i1, j));
      if (i2 >= 0 && i2 < cols) b.push(pos(i2, j));
    }
    if (a.length > 1) paths.push(line(a));
    if (b.length > 1) paths.push(line(b));
  }
  return { paths: paths.filter(Boolean) };
}
