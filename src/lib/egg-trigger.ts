/**
 * The easter egg's trigger, armed by the texture script for the nodes on the page (src/components/Egg.astro).
 *
 * Four nodes sit in the lattice at different depths of the page, one per guest, each with its own hue: by the name
 * (the Lorenz butterfly), beside the loops figure (the Chua ghost), beside the Papers heading (the replicator school)
 * and near the footer (the bilinear-game learners). A node brightens on hover; a click fires its guest on a desktop,
 * five taps on a phone. The code, ↑ ↑ ↓ ↓ ← → ← → B A, fires a random guest. The egg itself (src/lib/egg.ts) is a
 * separate chunk that loads on the first trigger step (a hover, a tap, the first ↑), so the page carries only this.
 *
 * Arrow keys are never prevented and a single press fires nothing; the listener stands down in text fields, with a
 * modifier held, and when the egg is off, which "Put it away" sets for all four nodes and localStorage remembers.
 * Clicking a dim node brings them back. Escape, or a second trigger, ends a running show.
 *
 * Two quiet things besides: with the engine running, each node rides the lattice's displacement at its own position
 * (`texture.flowAt`), so it drifts with the flow like the vertex it is; and a node pulses once, the first time it is
 * in view, never again that session (sessionStorage), and not under reduced motion.
 */
const KEY = 'gpandrade.egg';
const SEEN = 'gpandrade.egg.seen';
const CODE = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];

type Point = [number, number];

export function armEgg(nodes: HTMLElement[]): void {
  const read = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
  const write = (v: boolean) => { try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch { /* private mode */ } };
  let on = read();
  const setOff = (off: boolean) => { for (const n of nodes) n.classList.toggle('off', off); };
  setOff(!on);

  let mod: Promise<typeof import('./egg')> | undefined;
  const load = () => (mod ??= import('./egg'));
  const coarse = matchMedia('(hover: none), (pointer: coarse)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const centre = (n: HTMLElement): Point => { const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
  const onScreen = (n: HTMLElement): boolean => { const r = n.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const guest = (n: HTMLElement) => n.dataset.guest as import('./egg').Guest;
  const hue = (n: HTMLElement) => parseFloat(n.style.getPropertyValue('--hue')) || 0;

  /** Fire a node's guest from a point. The node stays lit while its show runs. */
  const fire = (n: HTMLElement, at: Point) => load().then((egg) => {
    const started = egg.toggle({
      at, guests: [guest(n)], hue: hue(n),
      onOff: () => { on = false; write(false); setOff(true); },
      onEnd: () => n.classList.remove('lit'),
    });
    if (started) n.classList.add('lit');
  });

  for (const n of nodes) {
    let taps = 0, tapTimer = 0;
    n.addEventListener('pointerenter', () => { if (on) load(); });
    n.addEventListener('click', () => {
      if (!on) {
        on = true; write(true); setOff(false);
        for (const m of nodes) { m.classList.add('lit'); setTimeout(() => m.classList.remove('lit'), 900); }
        load();
        return;
      }
      if (!coarse) { fire(n, centre(n)); return; }
      load();
      clearTimeout(tapTimer);
      if (++taps >= 5) { taps = 0; fire(n, centre(n)); return; }
      tapTimer = window.setTimeout(() => { taps = 0; }, 2500);
    });
  }

  // The code fires a random guest, from its node when that is on screen, else from the viewport centre.
  let progress = 0;
  addEventListener('keydown', (e) => {
    if (!on || e.repeat) return;
    const t = e.target as HTMLElement | null, tag = t?.tagName;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) { progress = 0; return; }
    const k = e.key.toLowerCase();
    progress = k === CODE[progress] ? progress + 1 : k === CODE[0] ? 1 : 0;
    if (progress === 1) load();
    if (progress === CODE.length) {
      progress = 0;
      const n = nodes[Math.floor(Math.random() * nodes.length)]!;
      fire(n, onScreen(n) ? centre(n) : [innerWidth / 2, innerHeight / 2]);
    }
  });

  // The pulse: once per node per session, the first time it is fully in view (and, scrolling in from below, 8% clear
  // of the bottom edge); a beat after load for the ones in view at load, so the page has settled.
  if (!reduced && 'IntersectionObserver' in window) {
    const seen = (() => { try { return new Set((sessionStorage.getItem(SEEN) ?? '').split(' ').filter(Boolean)); } catch { return new Set<string>(); } })();
    const t0 = performance.now();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        const n = e.target as HTMLElement, g = guest(n);
        if (!e.isIntersecting || seen.has(g)) continue;
        seen.add(g);
        try { sessionStorage.setItem(SEEN, [...seen].join(' ')); } catch { /* private mode */ }
        io.unobserve(n);
        setTimeout(() => {
          if (!on) return;
          n.classList.add('pulse');
          n.addEventListener('animationend', () => n.classList.remove('pulse'), { once: true });
        }, Math.max(250, 1400 - (performance.now() - t0)));
      }
    }, { threshold: 1, rootMargin: '0px 0px -8% 0px' });
    for (const n of nodes) if (!seen.has(guest(n))) io.observe(n);
  }

  // The drift: each node is translated by the lattice's displacement at its own rest position, after every engine
  // frame. Rest positions (document coordinates, without the translation) are measured once and whenever the page
  // reflows, so no layout is read per frame.
  const tex = window.texture;
  if (tex) {
    const rest = nodes.map(() => [0, 0] as Point), tr = nodes.map(() => [0, 0] as Point);
    const update = (): void => {
      nodes.forEach((n, i) => {
        const vy = rest[i]![1] - scrollY;
        if (vy < -200 || vy > innerHeight + 200) return;
        const [fx, fy] = tex.flowAt(rest[i]![0], vy);
        if (Math.abs(fx - tr[i]![0]) < 0.05 && Math.abs(fy - tr[i]![1]) < 0.05) return;
        tr[i] = [fx, fy];
        n.style.transform = `translate(${fx.toFixed(1)}px, ${fy.toFixed(1)}px)`;
      });
    };
    const measure = (): void => {
      nodes.forEach((n, i) => {
        const r = n.getBoundingClientRect();
        rest[i] = [r.left + r.width / 2 - tr[i]![0] + scrollX, r.top + r.height / 2 - tr[i]![1] + scrollY];
      });
      update();
    };
    measure();
    tex.onFrame(update);
    new ResizeObserver(measure).observe(document.body);
    addEventListener('resize', measure, { passive: true });
  }
}
