// The easter egg's node probe (docs/brief.md §20), run in CI before a deploy: node scripts/probe-nodes.mjs [dist]
//
// Serves the built site, lets the texture script generate the node set at 390, 720, 1024 and 1280, and checks that
// no node's box meets a text, link or media box; that the set follows the rule (in the gaps at the column's edges
// below 1024px, in the margins from it, alternating sides, the guests cycling); that nothing overflows; and that
// "Put it away" hides every node, a reload keeps them hidden, and the code brings them back and clears the flag.
// Any FAIL exits 1 and blocks the deploy. How many nodes are fully in view at every scroll position is reported, and
// a position with none on a phone (fewer than two on a desktop) is a WARN, since content can lengthen a gapless block.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';

const dist = resolve(process.argv[2] ?? 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    let file = join(dist, p);
    try { if ((await stat(file)).isDirectory()) file = join(file, 'index.html'); } catch { /* a file */ }
    const buf = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Content-Length': buf.length });
    res.end(buf);
  } catch { res.writeHead(404); res.end(); }
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const GUESTS = ['lorenz', 'chua', 'rps', 'spiral'];
const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
let fails = 0;
const say = (ok, s) => { if (ok === false) fails++; console.log(`${ok === 'warn' ? 'WARN' : ok ? 'PASS' : 'FAIL'} ${s}`); };
const browser = await chromium.launch();
const open = async (w, h, extra = {}) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, ...extra });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  return { ctx, page };
};
/** Rest boxes (the drift transform taken off) of every node and of every text, link and media box, in document px.
 *  Text is measured by its own line boxes (a Range over the element), media and the footer by the element. */
const measure = (page) => page.evaluate(() => {
  const wrap = document.querySelector('.wrap'), cs = getComputedStyle(wrap), wr = wrap.getBoundingClientRect();
  const col = [wr.left + parseFloat(cs.paddingLeft) + scrollX, wr.right - parseFloat(cs.paddingRight) + scrollX];
  const rect = (e) => { if (/^(VIDEO|IMG|FOOTER)$/.test(e.tagName)) return e.getBoundingClientRect(); const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect(); };
  const box = (e, d = [0, 0], r = rect(e)) => ({ l: r.left + scrollX - d[0], t: r.top + scrollY - d[1], r: r.right + scrollX - d[0], b: r.bottom + scrollY - d[1] });
  const content = [...wrap.querySelectorAll('h1, h2, h3, p, a, span, strong, figcaption, video, img, footer')]
    .map((e) => ({ ...box(e), what: `${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute('aria-label') || e.alt || '').trim().slice(0, 24)}"` }))
    .filter((b) => b.r > b.l && b.b > b.t);
  const nodes = [...document.querySelectorAll('.node')].map((n) => {
    const m = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(n.style.transform);
    const b = box(n, m ? [+m[1], +m[2]] : [0, 0], n.getBoundingClientRect());
    return { guest: n.dataset.guest, hue: n.style.getPropertyValue('--hue'), ...b, cx: (b.l + b.r) / 2, cy: (b.t + b.b) / 2, s: b.r - b.l, hits: content.filter((x) => x.l < b.r && x.r > b.l && x.t < b.b && x.b > b.t).map((x) => x.what) };
  });
  return { col, nodes, vw: innerWidth, vh: innerHeight, sw: document.documentElement.scrollWidth, dh: document.documentElement.scrollHeight };
});

for (const [w, h, extra] of [[390, 844, { isMobile: true, hasTouch: true, deviceScaleFactor: 3 }], [720, 900, {}], [1024, 800, {}], [1280, 800, {}]]) {
  const { ctx, page } = await open(w, h, extra);
  const m = await measure(page);
  const ns = m.nodes, margins = w >= 1024;
  const sp = ns.slice(1).map((n, i) => n.cy - ns[i].cy);
  const stats = sp.length ? `${Math.round(Math.min(...sp))}–${Math.round(Math.max(...sp))} px apart (median ${Math.round([...sp].sort((a, b) => a - b)[sp.length >> 1])})` : 'one node';
  say(ns.length >= 3, `${w}: ${ns.length} nodes over a ${m.dh}px document, ${stats}`);
  say(ns.every((n, i) => n.guest === GUESTS[i % 4] && n.hue !== ''), `${w}: the guests cycle in page order with their hues (${ns.slice(0, 5).map((n) => `${n.guest} ${n.hue}°`).join(', ')}, …)`);
  const hits = ns.filter((n) => n.hits.length);
  say(hits.length === 0, `${w}: no node box meets a text, link or media box${hits.length ? ': ' + hits.map((n) => `${n.guest} at y ${Math.round(n.cy)} over ${n.hits.join(', ')}`).join('; ') : ''}`);
  say(m.sw <= m.vw, `${w}: no horizontal overflow (scroll width ${m.sw} in a ${m.vw} viewport)`);
  const side = (n) => (n.r <= m.col[0] ? 'left' : n.l >= m.col[1] ? 'right' : n.l <= m.col[0] + 0.5 ? 'left edge' : n.r >= m.col[1] - 0.5 ? 'right edge' : 'in column');
  const alternating = ns.every((n, i) => side(n).startsWith(i & 1 ? 'right' : 'left'));
  if (margins) {
    const dist = ns.map((n) => (side(n) === 'left' ? m.col[0] - n.cx : n.cx - m.col[1]));
    say(ns.every((n) => side(n) === 'left' || side(n) === 'right') && dist.every((d) => Math.abs(d - 80) <= 0.5) && alternating && ns.every((n) => Math.abs(n.s - 32) <= 0.5),
      `${w}: every node in a margin, 80px out from the column (${m.col.map(Math.round).join('–')}), alternating sides, 32px (out: ${[...new Set(dist.map(Math.round))].join('/')})`);
    say(sp.every((d) => d >= 350 && d <= 450), `${w}: spacing within 350–450px`);
  } else {
    say(ns.every((n) => side(n).endsWith('edge')) && alternating && ns.every((n) => n.s >= 24 && n.s <= 32.5),
      `${w}: every node at a column edge (${m.col.map(Math.round).join('–')}), alternating sides, 24–32px to fit its gap (sizes ${ns.map((n) => Math.round(n.s)).join(' ')})`);
  }
  // Nodes fully in view at every scroll position, from the rest boxes: in the viewport, and on a phone also in the
  // 660px a phone browser shows with its bar open.
  const fewest = (vh) => { let min = Infinity, at = 0; for (let y = 0; y <= m.dh - vh; y += 20) { const c = ns.filter((n) => n.t >= y && n.b <= y + vh).length; if (c < min) { min = c; at = y; } } return [min, at]; };
  const need = margins ? 2 : 1, [min, at] = fewest(m.vh), [min2, at2] = margins ? [min, at] : fewest(660);
  say(min >= need && min2 >= need ? true : 'warn', `${w}×${h}: at least ${min} node${min === 1 ? '' : 's'} fully in view at every scroll position (fewest at scrollY ${at}; wanted ${need})${margins ? '' : `, ${min2} in a 660px viewport (fewest at ${at2})`}`);
  await ctx.close();
}

// Put away and the code, at 1280.
{
  const { ctx, page } = await open(1280, 800);
  const state = () => page.evaluate(() => ({
    off: document.querySelector('.nodes')?.classList.contains('off') ?? null,
    shown: [...document.querySelectorAll('.node')].filter((n) => n.getBoundingClientRect().width > 0).length,
    total: document.querySelectorAll('.node').length,
    lit: document.querySelectorAll('.node.lit').length,
    show: !!document.querySelector('.egg'),
    stored: localStorage.getItem('gpandrade.egg'),
  }));
  const [x, y] = await page.evaluate(() => { const r = document.querySelector('.node').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await page.mouse.click(x, y);
  await page.waitForSelector('.egg-off', { timeout: 3000 });
  await page.click('.egg-off');
  await page.waitForTimeout(600);
  const off = await state();
  say(off.off === true && off.shown === 0 && off.total > 0 && !off.show && off.stored === 'off', `put away: all ${off.total} nodes hidden (${off.shown} shown), the show ended (${!off.show}), localStorage "${off.stored}"`);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const kept = await state();
  say(kept.off === true && kept.shown === 0 && kept.total > 0, `after a reload: still hidden (${kept.shown} of ${kept.total} shown)`);
  for (const k of KONAMI) { await page.keyboard.press(k); await page.waitForTimeout(25); }
  await page.waitForTimeout(250);
  const back = await state();
  say(back.off === false && back.shown === back.total && back.total > 0 && back.lit === back.total && !back.show && back.stored === null, `the code brings them back: ${back.shown} of ${back.total} shown, ${back.lit} lit for a beat, no show started (${!back.show}), localStorage cleared (${back.stored})`);
  await page.waitForTimeout(1000);
  for (const k of KONAMI) { await page.keyboard.press(k); await page.waitForTimeout(25); }
  await page.waitForTimeout(400);
  const fired = await state();
  say(fired.show && fired.lit <= 1, `the code then fires a guest (show ${fired.show}, ${fired.lit} node lit)`);
  await page.keyboard.press('Escape');
  await ctx.close();
}

await browser.close();
server.close();
console.log(fails ? `\n${fails} failure${fails === 1 ? '' : 's'}` : '\nall checks passed');
process.exit(fails ? 1 : 0);
