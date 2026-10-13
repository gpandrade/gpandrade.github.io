# gpandrade.github.io — rebuild brief

Owner: Gabriel P. Andrade (Gab). Executor: Claude Code. Written 2026-09-30; amended 2026-10-01 with Gab's §14 answers and the design-review decisions (§15).

## 0. What this is

Rebuild the personal site at https://gpandrade.github.io (repo `gpandrade/gpandrade.github.io`) from a 2019-era hand-written `index.html` into an Astro site with a structured data layer, deployed by GitHub Actions. Two goals, in priority order:

1. **It stops going stale.** Adding a paper, talk, or news item is a YAML edit, doable in the GitHub web editor with no local tooling. A scheduled job later proposes additions automatically (Phase 2).
2. **It looks made on purpose.** Quiet, typographic, fast. The site is linked from the Gensyn site and from X, so link previews and mobile first-load matter as much as the desktop view.

Decisions already made (don't re-litigate): Astro; keep both PhD dynamics videos, compressed; the Writing section links out (no hosted blog). Design-review decisions of 2026-10-01 are in §15 and already folded in below.

Rules for the executor:

- Ask Gab before deleting any file or changing any public URL. `MSRIREUPaperZ.pdf` and `seminaryear1_deptnewsletter.pdf` keep their paths; every other legacy file goes (§4, §14 Q9).
- Never commit a media file over 3 MB. Compress first (§6). One exception: `media-src/` holds archive copies of the two source videos (Gab no longer has the originals); it is versioned but never deployed or loaded.
- Items marked `TODO(gab)` are unknowns. Batch them into one question list (§14) rather than guessing.
- Phase 1 first, end to end, before touching Phase 2.

## 1. Current state

- One hand-written `index.html`: `<font>` tags, `<center>`, float columns, a live JS clock in the footer, no `<!DOCTYPE>`, `<title>` outside `<head>`, no meta description, no Open Graph tags. Link previews from X/Slack/LinkedIn render blank.
- Content is stale: bio describes 2022-era work; papers list ends at EC 2023; CV link commented out; no email, X, or GitHub link.
- Gensyn's team page (https://www.gensyn.ai/team/gabriel-andrade) links here and describes Gab as "Researcher" working on "multi-agent reinforcement learning, game theory, and algorithmic economics." The two pages now point at each other, so title and framing should agree (§14).
- Weight: `lorenz_game.mp4` 67 MB and `fast_chua.mp4` 10 MB both autoplay on the landing page; `seminaryear1_slides.pdf` 25 MB and `seminaryear2_slides.pdf` 4 MB (neither linked from `index.html`); `Elegant_Background-20.jpg` 1.2 MB, `BINDS_logo.png` 1 MB, `umass-seal.gif` (referenced only in commented-out HTML).
- Stray live pages: `old_idx.html`, `sandbox.html`, `sorry.html`, `contact_info.html`, `research.html`, `word2vec.html` (873 KB).
- Linked PDFs that must keep their URLs: `MSRIREUPaperZ.pdf`, `seminaryear1_deptnewsletter.pdf`. `curriculum_vitae.pdf` is removed (§14 Q11); LinkedIn covers it.
- Repo history contains the large files forever; that's fine for Pages (well under limits). Don't rewrite history.

## 2. Information architecture

Single page at `/`. Sections in this order; a section renders only if its data file is non-empty. There is no News section and no Talks section (§14 Q6, Q7).

1. **Header**: headshot; name block of name, identity line, links row.
2. **About**: the bio (two short paragraphs) under a heading styled like the other section headings.
3. **Papers**: peer-reviewed papers and preprints, newest first, grouped by year with the year in a left gutter. The two dynamics videos live inside the COLT 2021 entry, since that paper is where they come from.
4. **Earlier work**: the 2015 and 2017 write-ups, in a smaller register.
5. **Writing**: links out to posts elsewhere, newest first. The section ends with one line pointing to the Gensyn research page (https://www.gensyn.ai/research) for the rest.
6. **Footer**: name, "Source on GitHub". No date stamp.

The index shows every paper, grouped by year, newest first within a year (entries within a year render in file order, so new entries go at the top of their year). Keep the `selected` field in the schema but don't use it; there is no `/papers` page.

## 3. Design direction

Audience is mixed: EC/COLT academics, DeFi and crypto people, potential collaborators, people who clicked from a tweet. The page should read like a well-set paper, not a portfolio, not a SaaS landing page, not a newspaper.

**The one memorable thing** is the learning-dynamics loops: a matrix game whose learning trajectory traces the Lorenz attractor. Everything else stays quiet so they register. They sit inside the paper they come from, with a caption, not in the hero.

### Tokens

```
                   light      dark
--bg               #F8F8F6    #121418
--ink              #1B1F2A    #E8E6E1
--ink-2            #5B6170    #A2A6AE
--accent           #6B5D8C    #A89BC8   a dull, smoky violet leaning blue (the
                   Gengar/Gastly/Haunter family), chosen in review over the
                   red-orange sampled from the loops; ≥ 4.5:1 on --bg in both
                   schemes. Alternates if wanted: bluer #655D8B/#A49DC8,
                   greyer #6D6581/#ADA5C0. Flat colour only, no gradients.
--rule             #E2E2DD    #262A31
```

Dark mode: `prefers-color-scheme`, no toggle. Body gets an explicit background. In dark mode the headshot is dimmed (brightness 0.85, saturate 0.9) and seated on a 1px `--rule` so it doesn't float as a bright block.

### Type

One family: **Newsreader** (variable, with optical size), self-hosted via `@fontsource-variable/newsreader`, latin subset only, `font-display: swap`, fallback `Georgia, "Iowan Old Style", "Times New Roman", serif`. No second family, no monospace anywhere.

Scale, 17px base:

- Name (h1): 2.25rem, weight 500, letter-spacing −0.01em, opsz at the high end.
- Identity line (under the name): "Researcher working on information markets, mechanism design, and multi-agent systems." Body size, `--ink-2`, may wrap to two lines beside the photo. No affiliation in it; the bio carries that.
- Section headings (h2): 1.25rem, weight 500, sentence case, generous space above (≈ 3rem), little below.
- Body: 1.0625rem / 1.55, `--ink`, measure ≤ 68ch.
- Meta (authors, venue, dates, captions, link rows): 0.9375rem, `--ink-2`.
- Paper titles: body size, weight 600, `--ink`; the title is the link.
- Gab's own name in author lists: weight 600 in `--ink`, always rendered as "Gabriel P. Andrade" wherever `authorMatch` hits, while the YAML keeps the arXiv spelling. This is the one emphasis device; it encodes which author is him.
- Year gutter: `font-variant-numeric: tabular-nums`.

### Layout

Left-aligned, ragged right. Content column `max-width: 42rem`, page padding 1.25rem, top margin 4rem desktop / 2rem mobile. At ≥ 720px the papers and writing lists use a two-column grid, `4.5rem 1fr`, with the year (or date) in the gutter, shown once per year group. Below 720px the gutter collapses to a line above the group.

```
Gabriel P. Andrade                              [headshot 160px,
Researcher working on information markets,       flush with the
mechanism design, and multi-agent systems.       column's right edge,
Email   Google Scholar   X   GitHub   LinkedIn   top on the cap height]

About
Bio paragraph one.
Bio paragraph two.

Papers
2026       Evidence Markets
           Safwan Hossain, Gabriel Andrade, Chengqi Zang, Yiling Chen
           arXiv preprint
           One plain-English sentence about the paper.
           arXiv   Blog post

           Oracle Design
           ...

2023       No-Regret Learning in Games is Turing Complete
           ...

2021       Learning in Matrix Games Can Be Arbitrarily Complex
           ...
           [ lorenz loop ]  [ chua loop ]
           Lorenz attractor  Chua circuit

Earlier work
2017       Math Systems for Diagnosis and Treatment of Breast Cancer
2015       A Matroid Generalization of Sperner's Lemma

Writing
2026-07    Credibly Neutral AI Oracles                 Gensyn research
2026-06    Markets That Explain Themselves             Gensyn research
...
           More on the Gensyn research page.
────────────────────────────────────────────
Gabriel P. Andrade   Source on GitHub
```

Headshot: square, 4px radius (not a circle). From 720px, 160px inside the column, flush with its right edge, top edge on the cap height of the name (measured, not eyeballed); the name block takes the remaining width and nothing crosses the column edges at any width. Under 720px, 120px above the name, left-aligned.

Videos: two-up `<figure>` inside the COLT 2021 entry, each ~50% width on desktop, stacked on mobile, native aspect ratio, `figcaption` in meta style. Markup in §6.

### Principles

- Type does the work. No cards, shadows, gradients, icons, badges, or borders around content. Whitespace separates sections; one hairline rule above the footer only.
- Every structural device carries information: the year gutter, the bold self-name, the caption. Nothing decorative.
- Moving things on the page: the two loops, and the background texture (§3 Texture), which is the one decorative element and must never compete with the loops. No entrance animations, no hover transitions beyond underline. Under `prefers-reduced-motion: reduce`, videos don't autoplay (the poster shows with controls) and the texture holds a static frame.
- Links are underlined text, sentence case, plain labels ("Blog post", "Slides"). Link rows (header links, per-paper links) underline in the accent at rest with the text staying ink; paper titles underline only on hover; body links underline in a faded ink. Link groups are separated by spacing, not punctuation.
- Nothing on the page is time-bound except the dates on Writing entries, so the page doesn't read as wrong when it's a year old.

### Don't

These are the tells of a templated page; none of them here:

- All-caps or tracked-out labels, eyebrows above headings, numbered markers.
- Middle dots between metadata (`A · B · C`), `WORD — fragment` labels, arrows appended to link text.
- A near-black (#0B0B0B/#111) standing in for black; warm cream + terracotta; near-black + acid green.
- Monospace for small labels or data.
- Circular avatar, social-icon sprite, "Get in touch" button, hero stats.
- Tailwind, component kits, client-side JS, with exactly two exemptions: the reduced-motion toggle for the videos (a few lines inline) and the texture layer (§3 Texture, ≤ 15 KB inline SVG plus JS).

### Texture

A full-viewport fixed layer behind the content: an original geometric tessellation (not a reproduction of any Escher work) drawn as hairline strokes, about 4% contrast against `--bg` in light mode and 6% in dark. Invisible at a glance, visible once you look.

- It evolves with scroll and never repeats: the tiling is parameterised by t = scrollY / scrollable height and its vertices are displaced by a smooth non-periodic field that advances with t. The field is game dynamics: the replicator vector field of a rock–paper–scissors game, sampled at a point that drifts along a Lorenz trajectory, so the texture is literally learning dynamics. (Fallback if ever needed: a sum of incommensurate sinusoids.)
- Implementation: a trihexagonal (kagome) lattice of three line families, `src/lib/texture.ts` shared by the build-time static frame and the client script in `Texture.astro`.
- Budget: under 15 KB of inline SVG plus JS, no library, at most a few hundred shapes, updates on requestAnimationFrame only. Without JS, or under prefers-reduced-motion, a static frame. Not in the OG image.
- Behind `site.texture`. If it hurts readability, Lighthouse, or scroll smoothness on a phone, ship with it off. If it competes with the video loops, dial the texture down, not the videos.

## 4. Stack and repo layout

Astro 7 (content layer, `file()` loaders; the brief said 5, 7 was current at build time), TypeScript strict, no integrations beyond `@astrojs/sitemap`. Node 24 LTS.

```
.
├── .github/workflows/deploy.yml
├── astro.config.mjs            site: 'https://gpandrade.github.io'
├── package.json                astro, @astrojs/sitemap, @fontsource-variable/newsreader
├── public/                     copied verbatim; the two kept PDF URLs preserved
│   ├── MSRIREUPaperZ.pdf
│   ├── seminaryear1_deptnewsletter.pdf
│   ├── media/                  lorenz.{webm,mp4,jpg}  chua.{webm,mp4,jpg}
│   ├── og.png  favicon.svg  robots.txt
├── src/
│   ├── site.ts                 name, identity line, role (OG), jobTitle, description, email, links row, authorMatch, bio, flags
│   ├── data/                   papers.yaml  writing.yaml  sources.yaml (Phase 2 config, §10)
│   ├── content.config.ts       file() loaders + zod schemas
│   ├── assets/headshot.png     dssi_portrait.png, moved
│   ├── styles/global.css       tokens, type scale, layout
│   ├── components/             Paper.astro  VideoLoop.astro  LinkList.astro  DatedList.astro  Texture.astro
│   ├── lib/                    texture.ts (shared texture math)  jpegSize.ts  inline.ts
│   ├── layouts/Base.astro      head/meta, fonts, skip link, footer
│   └── pages/index.astro
├── scripts/                    Phase 2 only
├── CLAUDE.md                   §13
├── docs/brief.md               this file
└── media-src/                  lorenz_game.mp4  fast_chua.mp4: archive copies of the source videos, never deployed
```

Legacy files (Gab's decision, §14 Q9; the executor still shows the audit before removing anything): delete `index.html` (replaced by the Astro build), `old_idx.html`, `sandbox.html`, `sorry.html`, `contact_info.html`, `research.html`, `word2vec.html`, `Elegant_Background-20.jpg`, `BINDS_logo.png`, `umass-seal.gif`, `pic_for_website.jpg`, `seminaryear1_slides.pdf`, `seminaryear2_slides.pdf`, `curriculum_vitae.pdf`, Keep `MSRIREUPaperZ.pdf` and `seminaryear1_deptnewsletter.pdf` (moved into `public/`, same URLs), `LICENSE`, and `README.md` (rewritten for the new setup). `dssi_portrait.png` becomes `src/assets/headshot.png` (no copy at the old URL). The two source videos move to `media-src/`; their old root URLs stop resolving.

## 5. Data schema

`src/data/papers.yaml` is the source of truth. Each entry needs a stable `id` (the `file()` loader requires it).

```yaml
- id: evidence-markets            # stable slug; never change once published
  title: Evidence Markets
  authors: [Safwan Hossain, Gabriel Andrade, Chengqi Zang, Yiling Chen]
  year: 2026                      # year of the venue, not the arXiv posting
  date: 2026-06                   # optional; orders entries within a year, newest first
  venue: arXiv preprint           # free text: "ACM EC 2023", "COLT 2021", "EC 2026 (poster)"
  arxiv: "2606.07434"             # optional; generates the arXiv link, and Phase 2 keys on it
  doi: null                       # optional; generates a publisher link
  pdf: null                       # optional local path, e.g. /MSRIREUPaperZ.pdf
  links:                          # optional, ordered; label is the visible text
    - { label: Blog post, url: https://blog.gensyn.ai/markets-that-explain-themselves/ }
  summary: >-                     # one plain-English sentence; the field that makes the list readable
    A generalization of prediction markets that pays traders for evidence as
    well as forecasts, and can resolve on the accumulated evidence when no
    external ground truth exists.
  media: []                       # optional: [{ src: /media/lorenz, caption: Lorenz attractor }]
  group: papers                   # papers | earlier
  selected: true
  draft: false                    # true = not rendered (Phase 2 writes proposed entries as drafts)
```

Zod: `id`, `title`, `year` (int), optional `date` (YYYY-MM or YYYY-MM-DD: the venue or posting date, used only to order entries within a year, newest first; undated entries follow, by id), `venue`, `authors` (string[], ≥ 1), `summary` required for `group: papers`, optional for `earlier`; `arxiv` string matching `^\d{4}\.\d{4,5}(v\d+)?$`; `doi` string; `pdf` string, either a local path starting with `/` or an absolute `https://` URL; `links` array of `{label, url}`; `media` array of `{src, caption}`; `group` enum default `papers`; `selected` bool default false; `draft` bool default false. A bad entry fails the build, which is the point.

Link rendering order per paper: arXiv (if `arxiv`), PDF (if `pdf`), Publisher (if `doi`), then `links` in order.

`writing.yaml`: `{ id, date (YYYY-MM or YYYY-MM-DD), title, outlet, url }`. Display date as "2026-06" style in the gutter.

`sources.yaml`: Phase 2 configuration (§10). Written in Phase 1 with the ORCID, OpenAlex id, and mailto so the refresh job has them when it exists; nothing reads it yet.

`src/site.ts`:

```ts
export const site = {
  name: 'Gabriel P. Andrade',
  role: 'Researcher at Gensyn, working on information markets and the mechanisms behind them.',
  jobTitle: 'Researcher',
  description: 'Researcher at Gensyn working on information markets, mechanism design, information elicitation, and multi-agent systems.',
  url: 'https://gpandrade.github.io',
  email: 'gabriel@gensyn.ai',
  twitter: '@gab_p_andrade',
  orcid: 'https://orcid.org/0009-0001-7397-9999',
  authorMatch: /Andrade/,          // which author string to embolden
  links: [
    { label: 'Email', url: 'mailto:gabriel@gensyn.ai' },
    { label: 'Google Scholar', url: 'https://scholar.google.com/citations?user=reI4hTYAAAAJ' },
    { label: 'X', url: 'https://x.com/gab_p_andrade' },
    { label: 'GitHub', url: 'https://github.com/gpandrade' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/gpandrade' },
  ],
};
```

## 6. Media

### Videos

Inspect first. Extract a frame from each source and look at it: if the frame includes matplotlib window chrome (axes, ticks, toolbar), crop to the plot with a `crop=w:h:x:y` filter. Then pick a 10–12 s segment that reads as a loop (the attractor should be well-formed by the start of the segment; use `-ss` to skip the build-up). Up to 20 s is acceptable if needed, at a higher CRF.

```bash
ffprobe -v error -show_entries format=duration:stream=width,height,avg_frame_rate -of default=nw=1 lorenz_game.mp4

# per video (lorenz_game.mp4 → lorenz, fast_chua.mp4 → chua); START chosen after inspection
ffmpeg -y -i lorenz_game.mp4 -ss START -t 12 -an \
  -vf "scale='min(720,iw)':-2:flags=lanczos,fps=30" \
  -c:v libx264 -profile:v high -crf 30 -preset slow -pix_fmt yuv420p -movflags +faststart \
  public/media/lorenz.mp4

ffmpeg -y -i lorenz_game.mp4 -ss START -t 12 -an \
  -vf "scale='min(720,iw)':-2:flags=lanczos,fps=30" \
  -c:v libvpx-vp9 -crf 38 -b:v 0 -row-mt 1 -deadline good -cpu-used 1 \
  public/media/lorenz.webm

ffmpeg -y -i public/media/lorenz.mp4 -ss 2 -frames:v 1 -q:v 3 public/media/lorenz.jpg
```

Targets: ≤ 2 MB per file. If over, raise CRF by 2, then drop width to 640.

Chosen in the build: Lorenz 120–132 s, Chua 45–57 s; no plot chrome in either, but 30–50% of each frame was empty, so each segment is cropped to its trajectories' bounding box plus margin, at 4:3 (`crop=1136:852:353:136` and `crop=1420:1064:112:50`), then scaled to 720 wide.

Colour: the trajectories are red-orange on white and the accent is violet, so `site.videoFilter` picks a treatment: `hue` (default) applies `hue-rotate(251deg) saturate(0.9)` in both schemes, which lands the dominant trajectory hue on the accent's 258° (angles measured, not nominal); `none` leaves the source colours; `invert` is hue-matched in light and `invert(1) hue-rotate(40deg)` in dark for a dark field. In dark mode the white frame sits on a 1px `--rule`.

Markup (`VideoLoop.astro`):

```html
<video autoplay muted loop playsinline preload="metadata" poster="/media/lorenz.jpg" width="…" height="…">
  <source src="/media/lorenz.webm" type="video/webm">
  <source src="/media/lorenz.mp4" type="video/mp4">
</video>
```

Under `prefers-reduced-motion: reduce`, a short inline script before `</body>` removes `autoplay`, pauses, and adds `controls` (a static page cannot read the preference any other way). Width/height come from the poster's JPEG header at build time, so there is no layout shift.

### Images

- Headshot: `dssi_portrait.png` (§14 Q3), 220×275, kept as is. Place in `src/assets/headshot.png`; render with Astro `<Image>` as a 220×220 crop shown at 160px (120px on mobile), `alt="Gabriel P. Andrade"`. Softness on retina screens is accepted; never upscale.
- `og.png`: 1200×630, site palette, name + role line + headshot at 220px (no upscaling), the site URL in the accent, no texture. Made once by screenshotting an HTML card with Playwright (`scratchpad`, not a build dependency); the PNG is committed.
- `favicon.svg`: a monogram in the accent colour. Keep it under 1 KB.

### PDFs

No PDF processing. The two kept PDFs are copied into `public/` unchanged; the seminar slides and the CV are deleted (§14 Q7, Q11).

## 7. Deploy

1. The default branch is `master`; the workflow triggers on it.
2. Add `.github/workflows/deploy.yml` (below; versions checked 2026-10-01: checkout v7, withastro/action v6 on Node 24, deploy-pages v5).
3. **Gab, in the browser**: repo Settings → Pages → Build and deployment → Source: **GitHub Actions**. Until this is flipped, Pages keeps serving the old branch build.
4. Push. Confirm the deploy job's URL loads, the two kept PDF URLs still resolve, and the workflow is the only thing building the site.
5. Local dev: `npm install`, `npm run dev`. `npm run build` must pass before any push that touches templates.

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [master]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: withastro/action@v6
        with:
          node-version: 24
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v5
```

`astro.config.mjs`: `site: 'https://gpandrade.github.io'`, no `base` (user site, served at root).

## 8. Head, previews, SEO

- `<title>Gabriel P. Andrade</title>`; `<meta name="description">` from `site.description`; canonical `https://gpandrade.github.io/`; `<html lang="en">`.
- Open Graph: `og:type` profile, `og:title`, `og:description`, `og:url`, `og:image` (absolute URL to `/og.png`, 1200×630, plus `og:image:width/height`); `twitter:card` summary_large_image, `twitter:creator` `@gab_p_andrade`.
- JSON-LD `Person`: name, jobTitle "Researcher", affiliation (Gensyn), url, image, `sameAs` = Scholar, LinkedIn, GitHub, X, ORCID (https://orcid.org/0009-0001-7397-9999), the Gensyn team page (https://www.gensyn.ai/team/gabriel-andrade).
- `@astrojs/sitemap`; `robots.txt` allowing everything and pointing at the sitemap.
- Skip link, visible `:focus-visible` outline in the accent, semantic landmarks, headings in order.

## 9. Content drafts

Gab edits these to taste. Author full names for arXiv entries should be pulled from the arXiv API (one batched `id_list` query) rather than trusted from below; the co-author names below are best-effort.

### Identity line (under the name)

Researcher working on information markets, mechanism design, and multi-agent systems.

### Role line (OG image and JSON-LD only)

Researcher at Gensyn, working on information markets and the mechanisms behind them.

Title is "Researcher" here and on the Gensyn team page (Gab updates the team page separately). Framing: information markets, mechanism design, information elicitation, multi-agent systems.

### Bio

I work at [Gensyn](https://www.gensyn.ai/research) on information markets: mechanisms that pay people and models to reveal what they know, and the multi-agent systems that take shape once many strategic participants trade on the result. Most of my work sits where mechanism design, information elicitation, and multi-agent learning meet.

Before Gensyn I was an Applied Scientist at Amazon, working on fraud and bad-actor detection. I received my PhD in computer science from the University of Colorado Boulder in 2022, advised by Rafael Frongillo and Joshua Grochow, where I studied the dynamics of learning in games. Before that I did an MS in applied mathematics at UMass Amherst.

### Meta description

Researcher at Gensyn working on information markets, mechanism design, information elicitation, and multi-agent systems.

### papers.yaml

Superseded on 2026-10-01 by `src/data/papers.yaml`, the source of truth. Relative to the first draft it adds, per Gab:

- Who Aggregates Information? Screening, Rent, and the Coexistence of CLOB and AMM Prediction Markets (arXiv 2609.20017, 2026; venue "arXiv preprint; CIRJE discussion paper"; CIRJE PDF linked). Replaces the old CLOB–CFMM TODO.
- Two-Sided Market Design for Goods with Perishable Utility (arXiv 2511.16357, 2025; title from the current arXiv version).
- Sharing is Caring: Efficient LM Post-Training with Collective RL Experience Sharing (arXiv 2509.08721, 2025; companion post linked).
- HDEE: Heterogeneous Domain Expert Ensemble (arXiv 2502.19385, 2025; the "Diverse Expert Ensembles" post is linked because it references HDEE).
- Electricity Market Dynamics as Smooth Games: Organizing Gradient-Based Learners and Identifying Instabilities (LLNL technical report LLNL-TR-824727, 2021; DOI 10.2172/1890814 gives the OSTI record, OSTI full text as the PDF).
- PhD thesis: Dynamical and Graphical Perspectives on Multi-Agent Economic Systems: Chaos, Complexity, and Universality of Learning Behaviours (University of Colorado Boulder, 2022; CU Scholar record linked).

Titles and author names for arXiv entries come from the arXiv API, verbatim. The summaries for the six additions are executor drafts from the abstracts, flagged in the PR for Gab's review. `matroid-sperner` venue is "MSRI-UP 2015 research report, Geometric Combinatorics Motivated by the Social Sciences" with a link labelled MSRI-UP. The IJCNN entry carries its DOI instead of a hand-written IEEE Xplore link.

### writing.yaml

Superseded by `src/data/writing.yaml`: the five bylined Gensyn pieces (§14 Q8), newest first.


## 10. Phase 2: keeping it fresh automatically

Google Scholar is out of scope as a data source: it has no API, its robots.txt forbids automated access, and scrapers get IP-banned on CI runners. The site links to Scholar; it never reads from it.

Sources with stable free APIs: arXiv (by id), OpenAlex (by author id, no key, polite pool via `mailto`), Semantic Scholar (by author id, optional). Author disambiguation in OpenAlex/S2 is imperfect, which is why the job proposes and a human approves.

`src/data/sources.yaml`:

```yaml
orcid: 0009-0001-7397-9999
openalex_author_id: A5017847566    # primary profile (holds the EC/COLT papers)
openalex_secondary_author_ids: [A5120316365]   # split profile that picked up a co-author's affiliation; Phase 2 queries both
semantic_scholar_author_id: null   # optional second source
mailto: gabriel@gensyn.ai          # OpenAlex polite pool
ignore: []                         # false positives: OpenAlex work ids, arXiv ids, or DOIs (a DOI here also silences its hint)
```

`scripts/refresh.py` (Python 3.11+, `requests`, `pyyaml`, nothing else):

1. **Enrich**: one batched `http://export.arxiv.org/api/query?id_list=…` for every entry with `arxiv`. Overwrite nothing a human wrote (`year`, `venue`, `summary`, `links`, `selected`). Fill `authors` if empty. If arXiv now lists a DOI or `journal_ref` for an entry whose `venue` still says preprint, add a hint to the PR body.
2. **Discover**: for the primary and each secondary OpenAlex id, `https://api.openalex.org/works?filter=authorships.author.id:{id}&per-page=50&sort=publication_year:desc&mailto={mailto}`. Match each work to existing entries by arXiv id, then DOI, then normalized title. Anything unmatched and not in `ignore` is appended to `papers.yaml` as `draft: true` with `summary: TODO`. Same for Semantic Scholar if configured (`https://api.semanticscholar.org/graph/v1/author/{id}/papers?fields=title,year,venue,externalIds&limit=100`).
3. **Propose**: if the file changed, open or update a single PR on branch `refresh/papers` via `peter-evans/create-pull-request`, titled "Papers refresh: N proposed, M hints". Gab reviews, writes the one-liner, flips `draft: false`, merges. Deploy runs on merge.
4. Never fail the deploy workflow: this is a separate workflow, `cron: '17 6 * * 1'` plus `workflow_dispatch`. If an API is down, skip it and say so in the PR body or job log.
5. Don't display citation counts. They drift and add nothing for this audience. (Storing them is harmless if wanted later.)

Rate limits are not a concern at this volume: arXiv asks for ≥ 3 s between requests (one request here); OpenAlex polite pool is generous; S2 allows 100 requests per 5 minutes unauthenticated.

Implementation notes (2026-10-13): `scripts/refresh.py` and `.github/workflows/refresh.yml`.

- Drafts go at the end of `papers.yaml` (the page orders by year). The `id` is a slug of the title; rename it before the entry is first published if wanted. Title and authors come from arXiv when the work has an arXiv id, else from OpenAlex; venue, year, and date are OpenAlex's guesses and need checking.
- A preprint and its published version are two OpenAlex works; they become one draft with the published venue, year, and DOI plus the arXiv id.
- Hints are DOIs or arXiv ids a source lists that the entry lacks (from arXiv and OpenAlex), and an arXiv `journal_ref` while the venue still says preprint. A DOI in `ignore` silences its hint. Hints without a new entry change no file, so they open no PR; they are in the run's job summary under Actions.
- Each run rebuilds `refresh/papers` from master and resets the branch when the content differs, so edits made on that branch are lost at the next run. Review and merge within the week, or merge the drafts as they are (they do not render) and edit on master.
- The script edits the file as text; filling an empty `authors` from arXiv is its only in-place change. It re-parses the result and refuses to write if any other field moved. `--dry-run` prints the diff and the report and writes nothing.
- Repo setting, once: Settings → Actions → General → Workflow permissions: read and write, plus "Allow GitHub Actions to create and approve pull requests". Both were already on when this shipped.

## 11. Phase 3, if wanted

- `/cv` rendered from `papers.yaml` plus a small `cv.yaml` (positions, education, service), with a print stylesheet, so the CV can't drift from the papers list. (`curriculum_vitae.pdf` is gone, §14 Q11; nothing to alias.)
- Custom domain: buy it, add `public/CNAME`, set A/AAAA records per GitHub's docs, enable "Enforce HTTPS". Optional; the github.io URL is fine.
- Analytics: none by default. If wanted, GoatCounter's single script tag; nothing heavier.

## 12. Phase 1 acceptance

- `npm run build` passes; Actions deploys to https://gpandrade.github.io; the two kept PDF URLs resolve.
- Adding a paper means editing `src/data/papers.yaml` and nothing else; a malformed entry fails the build with a readable error.
- First-load transfer under 1 MB excluding videos; each video file ≤ 2 MB, `preload="metadata"`; no client-side JS beyond the reduced-motion toggle and the texture layer (together under 15 KB).
- Lighthouse (mobile): Performance ≥ 95, Accessibility 100, Best Practices 100, SEO 100.
- Link preview validates (any OG debugger) with the og.png; `<title>` and description correct.
- Dark mode renders; reduced motion respected; keyboard focus visible; headings in order; body never scrolls sideways at 360px.
- Nothing in §3 "Don't" appears on the page.
- Screenshot the result at 390px and 1280px in both colour schemes and review against §3 before calling it done.

## 13. CLAUDE.md to add after Phase 1

```markdown
# gpandrade.github.io

Personal site. Astro 5, no client JS, deployed by .github/workflows/deploy.yml to GitHub Pages. Full spec in docs/brief.md.

## Adding content
- Paper: add to src/data/papers.yaml at the top of its year (schema in src/content.config.ts). Required: id, title, authors, year, venue, one-sentence summary, and at least one of arxiv / doi / pdf / links. Author names from the arXiv API when an arXiv id exists.
- Writing: src/data/writing.yaml.
- Push to the default branch; Actions deploys in about a minute.

## Rules
- Never rename or remove files under public/ that predate the rebuild; they are linked externally.
- No media over 3 MB, except the archive copies in media-src/, which are never deployed. Videos: webm + mp4 + poster, muted loop (docs/brief.md §6).
- One typeface (Newsreader), sentence case, no icons, cards, shadows, gradients. No client-side JS beyond the two exemptions in docs/brief.md §3 (reduced-motion toggle, texture layer).
- Flags in src/site.ts: `texture` (background layer on/off) and `videoFilter` (`hue` | `none` | `invert`).
- Run `npm run build` before pushing template changes.
```

## 14. Questions for Gab (resolved 2026-10-01)

Asked in one batch at the start of Phase 1. Gab's answers, folded into the sections above:

1. **Email and X**: gabriel@gensyn.ai; @gab_p_andrade (https://x.com/gab_p_andrade), also `twitter:creator`.
2. **Title and framing**: "Researcher" (and as JSON-LD jobTitle). Framing: information markets, mechanism design, information elicitation, multi-agent systems. Copy in §9. Gab updates the Gensyn team page to match, separately.
3. **Headshot**: `dssi_portrait.png`, the one the current site uses.
4. **Oracles paper**: author order as printed on the PDF. Both the oracles paper and Evidence Markets were non-archival accepted posters at the "Game Theory and Mechanism Design with Large Language Models" workshop at ACM EC 2026 (Rome, 6 July 2026, https://llm-incentives.com/). Venue strings and the Workshop link in §9.
5. **One-liners and captions**: as written in §9. Captions follow the source filenames: `lorenz_game.mp4` is the Lorenz attractor, `fast_chua.mp4` the Chua circuit.
6. **News**: section dropped entirely (no data file, schema, or component).
7. **Talks**: section dropped entirely; both seminar-slides PDFs deleted.
8. **Writing**: the five pieces in §9; "From Bundles to Time" left out.
9. **Deletions**: everything the new site doesn't use, after the audit: all legacy HTML including `word2vec.html`, unused images including `pic_for_website.jpg`, both seminar-slides PDFs, `curriculum_vitae.pdf`. Keep `MSRIREUPaperZ.pdf` and `seminaryear1_deptnewsletter.pdf` at their paths, `LICENSE`, and `README.md` (rewritten for the new setup).
10. **ORCID**: https://orcid.org/0009-0001-7397-9999, in JSON-LD `sameAs` and in `src/data/sources.yaml`.
11. **CV**: none. CV link removed from the links row; `curriculum_vitae.pdf` deleted. LinkedIn covers it.
12. **OpenAlex id**: both candidate profiles are Gab. A5017847566 is primary, A5120316365 secondary (a split that picked up a co-author's affiliation); Phase 2 queries both.

Follow-up decisions after the repo audit (2026-10-01): delete all 15 legacy files; headshot moves with no copy at the old URL; source videos kept in `media-src/`; the papers list shows everything (no `selected` cut-off, no `/papers`); six entries added (see §9); `matroid-sperner` venue fixed.

## 15. Design review decisions (2026-10-01)

Taken from screenshots at 1280px and 390px, light and dark, in three rounds:

1. Header variant C (over A, photo left with margin hang, and B, photo right with margin hang): nothing crosses the column edges; name block left on the column; 160px photo flush right, top on the cap height; identity line as the full sentence at body size (C1, over the shortened one-line C2).
2. Accent: smoky violet #6B5D8C / #A89BC8 replaces the sampled red-orange; accent underlines at rest on link rows; two alternates recorded in §3.
3. Videos: hue-matched filter is the default, the unfiltered and inverted treatments stay behind `site.videoFilter` for review.
4. Texture: shipped on if it meets the §3 budget; on/off pair in the PR screenshot set.
5. Reduced motion: inline script, one render per video.
6. Headshot kept as is; MSRI authors as on the title page with supervisors credited in the venue; HDEE venue from the ICLR page.

## 16. Motion pass (2026-10-13)

Changes to §2, §3 and §6 made on the `motion` branch; the text above is left as written.

1. **Loops under the header.** The two dynamics videos move out of the COLT 2021 entry into a `<figure id="loops">`
   between the links row and About: side by side at every width (about 45% each on a phone), one figcaption that
   links to the paper's entry. The entry keeps a plain "Loops" link in its link
   row. `site.loops`: `pair` (both loops) or `lorenz` (one larger Lorenz loop, the Chua loop stays in the entry). The
   posters are preloaded as the LCP candidates. `html { scroll-behavior: smooth }` outside reduced motion, so the
   in-page link scrolls rather than jumps.
2. **Texture engine rewritten** (`src/lib/texture.ts`). The old layer re-sampled the warp from a Lorenz trajectory on
   every scroll event (24 Lorenz units per page, about one wing orbit per wheel tick) and displaced vertices
   instantaneously, so it wobbled; its line parities also made a 144 px triangular arrangement rather than a kagome.
   Now: a damped follower on scroll (τ 0.22 s); vertices advect through the Hamiltonian field of the RPS replicator's
   conserved quantity (the same streamlines as the replicator orbits, area-preserving) with a weak spring (τ 20 s) and
   a cap of 0.6 cell; Lorenz drives the field offsets at about 3 units per page; an optional idle drift cycles once per
   120 s; the loop idles when nothing moves. The static frame stays an inline SVG (true-scale straight kagome lines);
   the live layer is a canvas, which the full variant needs for per-edge opacity. Budget: 20 KB inline SVG plus JS.
   Engine API on `window.texture`: `impulse(x, y, energy)`, `heat`, `wake()`, `displacement`. Nothing calls it yet.
3. **Variants behind `site.textureVariant`**: `conservative` (kagome, stirred) and `full` (the drawn edge set also
   transforms along the document: kagome at the top, the full triangular set through the middle, a honeycomb at the
   bottom). `site.textureIdle` toggles the idle drift.
4. Review material (screenshots, recordings, Lighthouse reports) lives in the session scratchpad, not the repo;
   `docs/screenshots/` is gone.

## 17. Easter egg (2026-10-13)

Built on the `egg` branch. The texture is the egg. Ideas, not content, come from the burst engine in
`gpandrade/blaze-black-companion` (`app/js/pokeball.js`): a `pointer-events: none` fixed layer, particles that remove
themselves, frame loops that terminate, a calm bloom under reduced motion, standing down in text fields and with
modifiers held, an off state in localStorage. Everything drawn here is original geometry: no sprites, drawings or
names from anywhere else.

1. **What happens.** A trigger launches a shock in the lattice through the engine API (`window.texture.shock`):
   three crests leave the trigger point at 900 px/s; vertices under a crest scatter along the dynamics field (the
   Hamiltonian RPS field that stirs the lattice on scroll, driven hard for the 0.15 s a crest takes to pass) with a
   radial push; edges behind the front light up in a hue that cycles with distance and time; the lattice relaxes
   (τ 1.6 s while excited) and the glow decays (τ 1.4 s), so it is back to the hairline by 6 s. A particle layer sits
   on top: a flash, two to four shockwave rings, 70–120 shards (triangles, hexagons, rhombi, rings) in one of four
   emission flavours, multiply-blended in light mode and screen-blended in dark, all Web Animations that remove
   their elements on finish. The guests are hue-cycled SVG strokes integrated live in the module: the Lorenz
   butterfly tracing itself while drifting across the screen (from 0.25 s, for 5.2 s); a school of
   rock–paper–scissors replicator orbits swimming across (from 0.7 s; heavy-tailed, 6 to 30 of them); the Chua
   double scroll as a ghost, phasing in and out four to six times with after-images, each apparition stirring the
   lattice (from 1.1 s); and, proposed from the electricity-market paper, two gradient learners in the bilinear
   game x·y, simultaneous gradient play spiralling out of the equilibrium and optimistic gradient play spiralling
   in (from 1.6 s). The show ends at 8 s.
2. **Triggers.** Desktop: the Konami code (↑ ↑ ↓ ↓ ← → ← → B A), or a click on the lattice node after the name (a
   kagome vertex: two hairlines crossing and a dot; quiet at rest, accent on hover). Phone, meaning a coarse pointer:
   five taps on the node within 2.5 s of each other. A single arrow press fires nothing and is never prevented; the
   key listener stands down in text fields, with a modifier held, on key repeat, and while the egg is off. Escape, or
   a second trigger, ends a show. The code's shock starts from the node when it is on screen, else the viewport
   centre.
3. **Off.** "Put it away", a link in the corner during a show, sets `localStorage['gpandrade.egg']` to `off`: the node
   dims to 40% and both triggers stand down. Clicking the dim node brings it back without firing. Remembered per
   browser, the way the companion remembers its balls.
4. **Cost.** The egg module (`src/lib/egg.ts`) is its own chunk, 9.3 KB raw (4.0 KB gzipped), imported on the first
   trigger step (a hover or tap on the node, or the first ↑), never at load. The trigger (`src/lib/egg-trigger.ts`)
   rides in the texture script, so the page makes one script request as before; that script is 9.7 KB raw against
   the 20 KB budget. No library. Every loop has a deadline and stops when the show ends; the engine's own loop returns
   to its idle schedule. JS work during a show is under 1 ms per frame at 1280 and at 390 × 3. Lighthouse mobile is
   unchanged at 98 / 100 / 100 / 100 with LCP 2.4 s.
5. **Reduced motion.** The calm bloom only: ten small shards for under a second. No shock (the engine does not run
   under reduced motion), no guests, no link.
6. **Engine additions** (`src/lib/texture.ts`): `shock(x, y, energy)`, `settle()`, `excited`. The rest frame is
   unchanged, so the static-to-canvas handover is too. A latent bug in the edge-midpoint arrays (computed before the
   neighbour vertex's rest position was filled in) is fixed; it affected only the `full` variant's structure phase,
   whose transitions now span the fifth of the page the formula describes rather than twice that.
7. **Flag.** `site.egg` (`PUBLIC_EGG=off` drops the node and the trigger). The egg needs `site.texture`.
8. **Files.** `src/lib/egg.ts`, `src/lib/egg-trigger.ts`, `src/components/Egg.astro`, the `.node` rules in
   `global.css`, the `shock` additions in `texture.ts`, the flag, and one line in `index.astro`. Deleting the first
   four and the flag removes the whole thing.
