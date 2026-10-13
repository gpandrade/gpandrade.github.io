/**
 * The easter egg's trigger, armed by the texture script when the node (src/components/Egg.astro) is on the page.
 *
 * Two ways in. The lattice node after the name brightens on hover: a click fires it on a desktop, five taps on a
 * phone. And the code: ↑ ↑ ↓ ↓ ← → ← → B A. The egg itself (src/lib/egg.ts) is a separate chunk that loads on the
 * first trigger step (a hover, a tap, the first ↑), so the page carries only this listener. Arrow keys are never
 * prevented and a single press fires nothing; the listener stands down in text fields, with a modifier held, and
 * when the egg is off, which "Put it away" sets and localStorage remembers. Clicking the node while off brings it
 * back. Escape, or a second trigger, ends a running show.
 */
const KEY = 'gpandrade.egg';
const CODE = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a'];

export function armEgg(node: HTMLElement): void {
  const read = () => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } };
  const write = (v: boolean) => { try { localStorage.setItem(KEY, v ? 'on' : 'off'); } catch { /* private mode */ } };
  let on = read();
  node.classList.toggle('off', !on);

  let mod: Promise<typeof import('./egg')> | undefined;
  const load = () => (mod ??= import('./egg'));
  const coarse = matchMedia('(hover: none), (pointer: coarse)').matches;

  /** The node's centre when it is on screen, else the viewport centre. */
  const at = (): [number, number] => {
    const r = node.getBoundingClientRect();
    if (r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth) return [r.left + r.width / 2, r.top + r.height / 2];
    return [innerWidth / 2, innerHeight / 2];
  };
  const fire = () => load().then((egg) => egg.toggle(at(), () => { on = false; write(false); node.classList.add('off'); }));

  let taps = 0, tapTimer = 0;
  node.addEventListener('pointerenter', () => { if (on) load(); });
  node.addEventListener('click', () => {
    if (!on) {
      on = true; write(true); node.classList.remove('off'); node.classList.add('lit');
      setTimeout(() => node.classList.remove('lit'), 900);
      load();
      return;
    }
    if (!coarse) { fire(); return; }
    load();
    clearTimeout(tapTimer);
    if (++taps >= 5) { taps = 0; fire(); return; }
    tapTimer = window.setTimeout(() => { taps = 0; }, 2500);
  });

  let progress = 0;
  addEventListener('keydown', (e) => {
    if (!on || e.repeat) return;
    const t = e.target as HTMLElement | null, tag = t?.tagName;
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) { progress = 0; return; }
    const k = e.key.toLowerCase();
    progress = k === CODE[progress] ? progress + 1 : k === CODE[0] ? 1 : 0;
    if (progress === 1) load();
    if (progress === CODE.length) { progress = 0; fire(); }
  });
}
