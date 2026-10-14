/**
 * The easter egg's trigger and its nodes, armed by the texture script (src/components/Texture.astro).
 *
 * The nodes are lattice vertices generated through the page from the rendered layout, at load and whenever it
 * reflows, by a density rule (docs/brief.md §20; the numbers live in src/site.ts). Below 1024px: one per `every[0]` px
 * of document, in the vertical gaps between entries and sections, at the column's edges, alternating sides, sized to
 * the gap. From 1024px: in both margins, `out` px from the column edge, alternating, one per `every[1]` px, evenly
 * from the name down to the footer line. Each node is bound to one of the four guests, cycling down the page (the
 * Lorenz butterfly, the Chua ghost, the replicator school, the bilinear-game learners), so neighbours differ and all
 * four appear within a screenful or two, and carries its guest's hue: shown on hover and while the guest runs, while
 * at rest the node is monochrome (or tinted, under site.nodeRest). A click fires the node's guest from the node, five
 * taps on a phone; the code, ↑ ↑ ↓ ↓ ← → ← → B A, fires a random guest from one of its nodes on screen, else from the
 * viewport centre. The egg itself (src/lib/egg.ts) is a separate chunk that loads on the first trigger step (a hover,
 * a tap, the first ↑), so the page carries only this.
 *
 * Arrow keys are never prevented and a single press fires nothing; the listener stands down in text fields and with
 * a modifier held. "Put it away" hides every node and localStorage remembers; the code brings them back and clears
 * the flag. Escape, or a second trigger, ends a running show.
 *
 * Two quiet things besides: with the engine running, each node rides the lattice's displacement at its own position
 * (`texture.flowAt`), so it drifts with the flow like the vertex it is; and one node pulses per session, the first to
 * come fully into view (sessionStorage), not under reduced motion.
 */
const KEY = 'gpandrade.egg'; // 'off' while put away
const SEEN = 'gpandrade.egg.seen'; // set once a node has pulsed this session
const CODE = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];
/** The guests in the order they cycle down the page, each with its hue on the egg's technicolor cycle and the two of
 *  the lattice's three line families that cross at its vertex (24px of hairline in a 32px box, and a dot). */
const H = 'M4 16H28', UP = 'M10 26.39L22 5.61', DOWN = 'M10 5.61L22 26.39';
const GUESTS = [['lorenz', 215, H + UP], ['chua', 290, UP + DOWN], ['rps', 135, H + DOWN], ['spiral', 25, H + UP]] as const;
const SIZE = 32, MIN = 24, PAD = 2; // a node's box; the smallest a gap may make it (so only the gaps between entries and sections qualify, not the ones inside a section); its clearance from the boxes around a gap
const DESKTOP = 1024;
/** What a node must never sit over below 1024px: text, links and media. */
const CONTENT = 'h1,h2,h3,p,a,figcaption,video,img,.year,.date,footer';
/** The cap-height centre of a one-line block's text as a fraction of its line box (Newsreader's metrics, measured). */
const CAP = 0.365;

type Point = [number, number];
type Guest = import('./egg').Guest;
/** A node's centre and size, in document px. */
interface Spot { x: number; y: number; s: number }

export interface NodeRule {
  /** Document px per node: below 1024px, and from 1024px. */
  every: readonly [number, number];
  /** From 1024px, how far out in the margin a node's centre sits from the column edge. */
  out: number;
  /** A cap on the count. */
  max: number;
}

/** Where the nodes go, from the layout as rendered now. */
function spots(rule: NodeRule): Spot[] {
  const wrap = document.querySelector('.wrap');
  if (!wrap) return [];
  const cs = getComputedStyle(wrap), wr = wrap.getBoundingClientRect(), sy = scrollY;
  const colL = wr.left + parseFloat(cs.paddingLeft) + scrollX, colR = wr.right - parseFloat(cs.paddingRight) + scrollX;
  const out: Spot[] = [];
  if (innerWidth >= DESKTOP) {
    // Evenly from the name's cap-height centre to the footer line's, alternating left and right.
    const cap = (el: Element | null): number => { const r = el?.getBoundingClientRect(); return r ? r.top + sy + r.height * CAP : 0; };
    const y0 = cap(wrap.querySelector('h1')), y1 = cap(wrap.querySelector('footer > *'));
    const n = Math.max(1, Math.round((y1 - y0) / rule.every[1]));
    for (let k = 0; k <= n && k < rule.max; k++) out.push({ x: k & 1 ? colR + rule.out : colL - rule.out, y: y0 + ((y1 - y0) * k) / n, s: SIZE });
    return out;
  }
  // The gaps: the free vertical intervals between the content boxes (text measured by its own line boxes, so a year
  // label stretched down its grid row counts as one line), each a candidate that holds a node centred in it and
  // sized to it. Then a walk down the page from gap to gap: from each node, the gap that best fits one `every[0]`
  // px below, where going past 110% of that costs four times as much as falling short, so a long stretch is taken
  // only when the layout leaves nothing nearer, and a gap that would shrink the node costs a little.
  const rect = (e: Element): DOMRect => { if (/^(VIDEO|IMG|FOOTER)$/.test(e.tagName)) return e.getBoundingClientRect(); const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect(); };
  const iv = [...wrap.querySelectorAll(CONTENT)].map(rect).filter((r) => r.width > 0 && r.height > 0)
    .map((r) => [r.top + sy, r.bottom + sy] as Point).sort((a, b) => a[0] - b[0]);
  const gaps: Spot[] = [];
  let b = iv[0]?.[1] ?? 0;
  for (const [t, u] of iv) {
    if (t - b >= MIN + 2 * PAD) gaps.push({ x: 0, y: (t + b) / 2, s: Math.min(SIZE, t - b - 2 * PAD) });
    if (u > b) b = u;
  }
  const T = rule.every[0];
  let y = iv[0]?.[0] ?? 0;
  for (let k = 0; k < rule.max; k++) {
    let g: Spot | undefined, best = Infinity;
    for (const c of gaps) {
      const s = c.y - y;
      const cost = Math.abs(s - T) + 4 * Math.max(0, s - 1.1 * T) + 2 * (SIZE - c.s);
      if (s >= T / 3 && cost < best) { best = cost; g = c; }
    }
    if (!g) break;
    out.push({ x: k & 1 ? colR - g.s / 2 : colL + g.s / 2, y: g.y, s: g.s });
    y = g.y;
  }
  return out;
}

export function armEgg(rule: NodeRule): void {
  const box = document.createElement('div');
  box.className = 'nodes';
  box.setAttribute('aria-hidden', 'true');
  document.body.append(box);
  let nodes: HTMLElement[] = [];

  const read = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
  let on = read();
  const hide = (off: boolean) => box.classList.toggle('off', off);
  hide(!on);

  let mod: Promise<typeof import('./egg')> | undefined;
  const load = () => (mod ??= import('./egg'));
  const coarse = matchMedia('(hover: none), (pointer: coarse)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const centre = (n: HTMLElement): Point => { const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const onScreen = (n: HTMLElement): boolean => { const r = n.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const guest = (n: HTMLElement) => n.dataset.guest as Guest;
  const hue = (n: HTMLElement) => parseFloat(n.style.getPropertyValue('--hue')) || 0;
  /** A beat of light on every node. */
  const beat = (): void => { for (const m of nodes) m.classList.add('lit'); setTimeout(() => { for (const m of nodes) m.classList.remove('lit'); }, 900); };

  /** Fire a guest from a point: from a node, which stays lit while its show runs, or (the code, with none of the
   *  guest's nodes on screen) from the viewport centre. */
  const fire = (g: Guest, h: number, at: Point, n?: HTMLElement) => load().then((egg) => {
    const started = egg.toggle({
      at, guests: [g], hue: h,
      onOff: () => { on = false; try { localStorage.setItem(KEY, 'off'); } catch { /* private mode */ } hide(true); },
      onEnd: () => n?.classList.remove('lit'),
    });
    if (started) n?.classList.add('lit');
  });
  const fireNode = (n: HTMLElement) => fire(guest(n), hue(n), centre(n), n);
  /** The code brings the nodes back from put away, with a beat of light, without firing. */
  const restore = (): void => { on = true; try { localStorage.removeItem(KEY); } catch { /* private mode */ } hide(false); beat(); load(); watch(); };

  // A hover loads the module; a click fires the node's guest, or on a phone the fifth tap within 2.5 s of each other,
  // counted per node.
  const taps = new WeakMap<Element, { n: number; t: number }>();
  box.addEventListener('pointerover', () => { if (on) load(); });
  box.addEventListener('click', (e) => {
    const n = (e.target as Element).closest<HTMLElement>('.node');
    if (!n || !on) return;
    if (!coarse) { fireNode(n); return; }
    load();
    const s = taps.get(n) ?? { n: 0, t: 0 };
    clearTimeout(s.t);
    if (++s.n >= 5) { s.n = 0; fireNode(n); } else s.t = window.setTimeout(() => { s.n = 0; }, 2500);
    taps.set(n, s);
  });

  // The code: a random guest, from one of its nodes on screen, else from the viewport centre; while put away, it
  // brings the nodes back instead.
  let progress = 0;
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const t = e.target as HTMLElement | null, tag = t?.tagName;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) { progress = 0; return; }
    const k = e.key.toLowerCase();
    progress = k === CODE[progress] ? progress + 1 : k === CODE[0] ? 1 : 0;
    if (progress === 1 && on) load();
    if (progress < CODE.length) return;
    progress = 0;
    if (!on) { restore(); return; }
    const [g, h] = GUESTS[Math.floor(Math.random() * GUESTS.length)]!;
    const near = nodes.filter((n) => guest(n) === g && onScreen(n));
    const n = near[Math.floor(Math.random() * near.length)];
    fire(g, h, n ? centre(n) : [innerWidth / 2, innerHeight / 2], n);
  });

  // The pulse: one per session, on the first node fully in view (8% clear of the bottom edge), a beat after load
  // so the page has settled; not under reduced motion, not while put away.
  let pulsed = (() => { try { return sessionStorage.getItem(SEEN) !== null; } catch { return false; } })();
  let io: IntersectionObserver | undefined;
  const t0 = performance.now();
  const watch = (): void => {
    io?.disconnect();
    if (reduced || pulsed || !on || !('IntersectionObserver' in window)) return;
    io = new IntersectionObserver((entries) => {
      const e = entries.find((x) => x.isIntersecting);
      if (!e) return;
      io!.disconnect();
      const n = e.target as HTMLElement;
      setTimeout(() => {
        if (pulsed || !on || !n.isConnected) return; // reflowed meanwhile: the new nodes are being watched instead
        pulsed = true;
        try { sessionStorage.setItem(SEEN, '1'); } catch { /* private mode */ }
        n.classList.add('pulse');
        n.addEventListener('animationend', () => n.classList.remove('pulse'), { once: true });
      }, Math.max(250, 1400 - (performance.now() - t0)));
    }, { threshold: 1, rootMargin: '0px 0px -8% 0px' });
    for (const n of nodes) io.observe(n);
  };

  // The drift: each node is translated by the lattice's displacement at its own rest position, after every engine
  // frame. Rest positions are the generated ones, so no layout is read per frame.
  const tex = window.texture;
  let rest: Point[] = [], tr: Point[] = [];
  const drift = (): void => {
    nodes.forEach((n, i) => {
      const vy = rest[i]![1] - scrollY;
      if (vy < -200 || vy > innerHeight + 200) return;
      const [fx, fy] = tex!.flowAt(rest[i]![0], vy);
      if (Math.abs(fx - tr[i]![0]) < 0.05 && Math.abs(fy - tr[i]![1]) < 0.05) return;
      tr[i] = [fx, fy];
      n.style.transform = `translate(${fx.toFixed(1)}px, ${fy.toFixed(1)}px)`;
    });
  };
  if (tex) tex.onFrame(drift);

  // The nodes, from the layout: at load, and again whenever the page's width or height changes.
  let key = '';
  const layout = (): void => {
    const k = `${innerWidth} ${document.documentElement.scrollHeight}`;
    if (k === key) return;
    key = k;
    const sp = spots(rule);
    nodes = sp.map((p, i) => {
      const [g, h, d] = GUESTS[i % GUESTS.length]!;
      const n = document.createElement('span');
      n.className = 'node';
      n.dataset.guest = g;
      n.style.cssText = `--hue:${h};left:${(p.x - p.s / 2).toFixed(1)}px;top:${(p.y - p.s / 2).toFixed(1)}px;width:${p.s}px;height:${p.s}px`;
      n.innerHTML = `<svg viewBox="0 0 32 32"><path d="${d}"/><circle cx="16" cy="16" r="2.2"/></svg>`;
      return n;
    });
    box.replaceChildren(...nodes);
    rest = sp.map((p) => [p.x, p.y]);
    tr = sp.map(() => [0, 0]);
    if (tex) drift();
    watch();
  };
  layout();
  new ResizeObserver(layout).observe(document.body);
  addEventListener('resize', layout, { passive: true });
}
