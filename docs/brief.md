# gpandrade.github.io — rebuild brief

Owner: Gabriel P. Andrade (Gab). Executor: Claude Code. Written 2026-09-30; amended 2026-10-01 with Gab's §14 answers.

## 0. What this is

Rebuild the personal site at https://gpandrade.github.io (repo `gpandrade/gpandrade.github.io`) from a 2019-era hand-written `index.html` into an Astro site with a structured data layer, deployed by GitHub Actions. Two goals, in priority order:

1. **It stops going stale.** Adding a paper, talk, or news item is a YAML edit, doable in the GitHub web editor with no local tooling. A scheduled job later proposes additions automatically (Phase 2).
2. **It looks made on purpose.** Quiet, typographic, fast. The site is linked from the Gensyn site and from X, so link previews and mobile first-load matter as much as the desktop view.

Decisions already made (don't re-litigate): Astro; keep both PhD dynamics videos, compressed; the Writing section links out (no hosted blog).

Rules for the executor:

- Ask Gab before deleting any file or changing any public URL. `MSRIREUPaperZ.pdf` and `seminaryear1_deptnewsletter.pdf` keep their paths; every other legacy file goes (§4, §14 Q9).
- Never commit a media file over 3 MB. Compress first (§6).
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

1. **Header**: name, role line, headshot, bio (two short paragraphs), links row.
2. **Papers**: peer-reviewed papers and preprints, newest first, grouped by year with the year in a left gutter. The two dynamics videos live inside the COLT 2021 entry, since that paper is where they come from.
3. **Earlier work**: the 2015 and 2017 write-ups, in a smaller register.
4. **Writing**: links out to posts elsewhere, newest first. The section ends with one line pointing to the Gensyn research page (https://www.gensyn.ai/research) for the rest.
5. **Footer**: name, "Source on GitHub". No date stamp.

Keep the `selected` field in the schema, but the index shows all papers until the list exceeds ~10; then switch the index to `selected` only and add `/papers`.

## 3. Design direction

Audience is mixed: EC/COLT academics, DeFi and crypto people, potential collaborators, people who clicked from a tweet. The page should read like a well-set paper, not a portfolio, not a SaaS landing page, not a newspaper.

**The one memorable thing** is the learning-dynamics loops: a matrix game whose learning trajectory traces the Lorenz attractor. Everything else stays quiet so they register. They sit inside the paper they come from, with a caption, not in the hero.

### Tokens

```
                   light      dark
--bg               #F8F8F6    #121418
--ink              #1B1F2A    #E8E6E1
--ink-2            #5B6170    #A2A6AE
--accent           sampled from the dominant trajectory colour in the Lorenz
                   video (extract a frame, pick it) so site and videos share a
                   palette; if the video is default-matplotlib blue/orange,
                   use #285C8F light / #8FB4DA dark
--rule             #E2E2DD    #262A31
```

Dark mode: `prefers-color-scheme`, no toggle. Body gets an explicit background.

### Type

One family: **Newsreader** (variable, with optical size), self-hosted via `@fontsource-variable/newsreader`, latin subset only, `font-display: swap`, fallback `Georgia, "Iowan Old Style", "Times New Roman", serif`. No second family, no monospace anywhere.

Scale, 17px base:

- Name (h1): 2.25rem, weight 500, letter-spacing −0.01em, opsz at the high end.
- Section headings (h2): 1.25rem, weight 500, sentence case, generous space above (≈ 3rem), little below.
- Body: 1.0625rem / 1.55, `--ink`, measure ≤ 68ch.
- Meta (authors, venue, dates, captions, link rows): 0.9375rem, `--ink-2`.
- Paper titles: body size, weight 600, `--ink`; the title is the link.
- Gab's own name in author lists: weight 600 in `--ink`. This is the one emphasis device; it encodes which author is him.
- Year gutter: `font-variant-numeric: tabular-nums`.

### Layout

Left-aligned, ragged right. Content column `max-width: 42rem`, page padding 1.25rem, top margin 4rem desktop / 2rem mobile. At ≥ 720px the papers and writing lists use a two-column grid, `4.5rem 1fr`, with the year (or date) in the gutter, shown once per year group. Below 720px the gutter collapses to a line above the group.

```
Gabriel P. Andrade                                     [headshot 112px]
Researcher at Gensyn, working on information markets
and the mechanisms behind them.

Bio paragraph one.
Bio paragraph two.

Email   Google Scholar   X   GitHub   LinkedIn

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

Headshot: 112px square, 2px radius (not a circle), top-right of the header at ≥ 560px; above the name on smaller screens.

Videos: two-up `<figure>` inside the COLT 2021 entry, each ~50% width on desktop, stacked on mobile, native aspect ratio, `figcaption` in meta style. Markup in §6.

### Principles

- Type does the work. No cards, shadows, gradients, icons, badges, or borders around content. Whitespace separates sections; one hairline rule above the footer only.
- Every structural device carries information: the year gutter, the bold self-name, the caption. Nothing decorative.
- One moving thing on the page: the two loops. No entrance animations, no hover transitions beyond underline. Under `prefers-reduced-motion: reduce`, videos don't autoplay; the poster shows with controls.
- Links are underlined text, sentence case, plain labels ("Blog post", "Slides"). Link groups are separated by spacing, not punctuation.
- Nothing on the page is time-bound except the dates on Writing entries, so the page doesn't read as wrong when it's a year old.

### Don't

These are the tells of a templated page; none of them here:

- All-caps or tracked-out labels, eyebrows above headings, numbered markers.
- Middle dots between metadata (`A · B · C`), `WORD — fragment` labels, arrows appended to link text.
- A near-black (#0B0B0B/#111) standing in for black; warm cream + terracotta; near-black + acid green.
- Monospace for small labels or data.
- Circular avatar, social-icon sprite, "Get in touch" button, hero stats.
- Tailwind, component kits, client-side JS (Astro ships none by default; keep it that way).

## 4. Stack and repo layout

Astro 5 (content layer, `file()` loaders), TypeScript strict, no integrations beyond `@astrojs/sitemap`. Node LTS.

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
│   ├── site.ts                 name, role, jobTitle, description, email, links row, authorMatch
│   ├── data/                   papers.yaml  writing.yaml  sources.yaml (Phase 2 config, §10)
│   ├── content.config.ts       file() loaders + zod schemas
│   ├── assets/headshot.png     dssi_portrait.png, moved
│   ├── styles/global.css       tokens, type scale, layout
│   ├── components/             Paper.astro  VideoLoop.astro  LinkList.astro  DatedList.astro
│   ├── layouts/Base.astro      head/meta, fonts, skip link, footer
│   └── pages/index.astro
├── scripts/                    Phase 2 only
├── CLAUDE.md                   §13
└── docs/brief.md               this file
```

Legacy files (Gab's decision, §14 Q9; the executor still shows the audit before removing anything): delete `index.html` (replaced by the Astro build), `old_idx.html`, `sandbox.html`, `sorry.html`, `contact_info.html`, `research.html`, `word2vec.html`, `Elegant_Background-20.jpg`, `BINDS_logo.png`, `umass-seal.gif`, `pic_for_website.jpg`, `seminaryear1_slides.pdf`, `seminaryear2_slides.pdf`, `curriculum_vitae.pdf`, and the two source videos once compressed copies exist in `public/media/` (history keeps the originals). Keep `MSRIREUPaperZ.pdf` and `seminaryear1_deptnewsletter.pdf` (moved into `public/`, same URLs), `LICENSE`, and `README.md` (rewritten for the new setup). `dssi_portrait.png` becomes `src/assets/headshot.png`.

## 5. Data schema

`src/data/papers.yaml` is the source of truth. Each entry needs a stable `id` (the `file()` loader requires it).

```yaml
- id: evidence-markets            # stable slug; never change once published
  title: Evidence Markets
  authors: [Safwan Hossain, Gabriel Andrade, Chengqi Zang, Yiling Chen]
  year: 2026                      # year of the venue, not the arXiv posting
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

Zod: `id`, `title`, `year` (int), `venue`, `authors` (string[], ≥ 1), `summary` required for `group: papers`, optional for `earlier`; `arxiv` string matching `^\d{4}\.\d{4,5}(v\d+)?$`; `doi` string; `pdf` string, either a local path starting with `/` or an absolute `https://` URL; `links` array of `{label, url}`; `media` array of `{src, caption}`; `group` enum default `papers`; `selected` bool default false; `draft` bool default false. A bad entry fails the build, which is the point.

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

Targets: ≤ 2 MB per file. If over, raise CRF by 2, then drop width to 640. Sample `--accent` from the resulting frame (§3).

Markup (`VideoLoop.astro`):

```html
<video autoplay muted loop playsinline preload="metadata" poster="/media/lorenz.jpg" width="…" height="…">
  <source src="/media/lorenz.webm" type="video/webm">
  <source src="/media/lorenz.mp4" type="video/mp4">
</video>
```

Under `prefers-reduced-motion: reduce`, render without `autoplay` and with `controls`. Always set width/height to avoid layout shift.

### Images

- Headshot: `dssi_portrait.png` (§14 Q3). Place in `src/assets/headshot.png`; render with Astro `<Image>` at `width={224}` (2× of 112px), `alt="Gabriel P. Andrade"`.
- `og.png`: 1200×630, site palette, name + role line + headshot. Make it once by any means (an HTML page screenshotted at that size is fine); commit the PNG; don't add a screenshot dependency to the build.
- `favicon.svg`: a monogram in the accent colour. Keep it under 1 KB.

### PDFs

No PDF processing. The two kept PDFs are copied into `public/` unchanged; the seminar slides and the CV are deleted (§14 Q7, Q11).

## 7. Deploy

1. The default branch is `master`; the workflow triggers on it.
2. Add `.github/workflows/deploy.yml` (below; check for newer major versions of the three actions before committing).
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
      - uses: actions/checkout@v4
      - uses: withastro/action@v3
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
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

### Role line

Researcher at Gensyn, working on information markets and the mechanisms behind them.

Title is "Researcher" here and on the Gensyn team page (Gab updates the team page separately). Framing: information markets, mechanism design, information elicitation, multi-agent systems.

### Bio

I'm a researcher at [Gensyn](https://www.gensyn.ai/research), where I work on information markets: mechanisms that pay people and models to reveal what they know, and the multi-agent systems that take shape once many strategic participants trade on the result. Most of my work sits where mechanism design, information elicitation, and multi-agent learning meet.

Before Gensyn I was an Applied Scientist at Amazon, working on fraud and bad-actor detection. I received my PhD in computer science from the University of Colorado Boulder in 2022, advised by Rafael Frongillo and Joshua Grochow, where I studied the dynamics of learning in games. Before that I did an MS in applied mathematics at UMass Amherst.

### Meta description

Researcher at Gensyn working on information markets, mechanism design, information elicitation, and multi-agent systems.

### papers.yaml

```yaml
- id: evidence-markets
  title: Evidence Markets
  authors: [Safwan Hossain, Gabriel Andrade, Chengqi Zang, Yiling Chen]
  year: 2026
  venue: arXiv preprint; poster at the Game Theory and Mechanism Design with LLMs workshop, ACM EC 2026
  arxiv: "2606.07434"
  links:
    - { label: Blog post, url: https://www.gensyn.ai/research/markets-that-explain-themselves }
  summary: >-
    A generalization of prediction markets that pays traders for evidence as
    well as forecasts, and can resolve on the accumulated evidence when no
    external ground truth exists.
  selected: true

- id: credibly-neutral-oracles
  title: Manipulation-Resistant AI Oracles via Credible Neutrality
  authors: [Mary Monroe, Gabriel P. Andrade, Rafael Frongillo, Bo Waggoner]   # order as printed on the PDF (§14 Q4); executor verifies against the PDF
  year: 2026
  venue: Poster at the Game Theory and Mechanism Design with LLMs workshop, ACM EC 2026
  pdf: https://blog.gensyn.ai/content/files/2026/08/Manipulation-Resistant-AI-Oracles-via-Credible-Neutrality.pdf
  links:
    - { label: Blog post, url: https://www.gensyn.ai/research/credibly-neutral-ai-oracles }
    - { label: Workshop, url: https://llm-incentives.com/ }
  summary: >-
    If the first-pass report in a dispute-based oracle is credibly neutral and
    accurate, the vote needed to overturn it can be raised and manipulation
    becomes provably harder; without neutrality, no threshold does better
    than a coin flip.
  selected: true

- id: no-regret-turing-complete
  title: No-Regret Learning in Games is Turing Complete
  authors: [Gabriel P. Andrade, Rafael Frongillo, Georgios Piliouras]
  year: 2023
  venue: ACM EC 2023
  arxiv: "2202.11871"
  summary: >-
    Replicator dynamics in matrix games can simulate any Turing machine, so
    basic questions about where learning in a game ends up are undecidable.
  selected: true

- id: learning-arbitrarily-complex
  title: Learning in Matrix Games Can Be Arbitrarily Complex
  authors: [Gabriel P. Andrade, Rafael Frongillo, Georgios Piliouras]
  year: 2021
  venue: COLT 2021
  arxiv: "2103.03405"
  summary: >-
    Learning dynamics in matrix games can approximate any dynamical system,
    chaotic ones included. The loops below are learning trajectories in a
    matrix game tracing the Lorenz attractor and the Chua circuit.
  media:
    - { src: /media/lorenz, caption: Lorenz attractor }   # captions confirmed (§14 Q5)
    - { src: /media/chua, caption: Chua circuit }
  selected: true

- id: graphical-economies-resale
  title: Graphical Economies with Resale
  authors: [Gabriel P. Andrade, Rafael Frongillo, Elliot Gorokhovsky, Sharadha Srinivasan]
  year: 2021
  venue: ACM EC 2021
  arxiv: "2106.14397"
  summary: >-
    Exchange economies on a network, where agents trade only with their
    neighbours, extended to allow resale, and what that does to equilibrium
    prices.
  selected: true

- id: graph-models-neurodynamics
  title: Graph Models of Neurodynamics to Support Oscillatory Associative Memories
  authors: [Gabriel P. Andrade, Miklós Ruszinkó, Robert Kozma]
  year: 2018
  venue: IJCNN 2018
  links:
    - { label: IEEE Xplore, url: https://ieeexplore.ieee.org/document/8489419 }
  summary: Network models of oscillatory neural dynamics for associative memory.
  selected: false

- id: breast-cancer-math-systems
  title: Math Systems for Diagnosis and Treatment of Breast Cancer
  authors: [C. Amorin, G. P. Andrade, S. Castro-Pearson, A. K. Geraldo, B. Iles, D. Katsaros, T. Mullen, S. Nguyen, O. Spiro, M. Sych]
  year: 2017
  venue: UMass Amherst Department of Mathematics & Statistics Newsletter
  pdf: /seminaryear1_deptnewsletter.pdf
  group: earlier

- id: matroid-sperner
  title: A Matroid Generalization of Sperner's Lemma
  authors: [G. P. Andrade, A. R. Rey, A. J. R. Sandoval, M. Sondjaja, F. Su]
  year: 2015
  venue: MSRI-UP research report            # TODO(gab): confirm
  pdf: /MSRIREUPaperZ.pdf
  group: earlier

# TODO(gab): CLOB–CFMM equivalence paper (with Frongillo and Waggoner) — add when public.
```

### writing.yaml

Gensyn's team page attributes four pieces to Gab; the oracle post is added because he's an author on the paper behind it. Newest first.

```yaml
- id: credibly-neutral-ai-oracles
  date: 2026-07
  title: Credibly Neutral AI Oracles
  outlet: Gensyn research
  url: https://www.gensyn.ai/research/credibly-neutral-ai-oracles
- id: markets-that-explain-themselves
  date: 2026-06
  title: Markets That Explain Themselves
  outlet: Gensyn research
  url: https://www.gensyn.ai/research/markets-that-explain-themselves
- id: prediction-markets-we-were-promised
  date: 2026-01
  title: "The Prediction Markets We Were Promised: A Guide to Slaying Dragons With Oracles, Commitments, and Blockchains"
  outlet: Gensyn guides
  url: https://www.gensyn.ai/guides/a-guide-to-slaying-dragons-with-oracles-commitments-and-blockchains
- id: lmsr-guide
  date: 2025-12
  title: LMSR (Logarithmic Market Scoring Rule)
  outlet: Gensyn guides
  url: https://www.gensyn.ai/guides/lmsr-logarithmic-market-scoring-rule
- id: prediction-markets-are-learning-algorithms
  date: 2025-12
  title: Prediction Markets are Learning Algorithms
  outlet: Gensyn research
  url: https://www.gensyn.ai/research/prediction-markets-are-learning-algorithms
# "From Bundles to Time" and other pieces without Gab's byline are left out (§14 Q8).
```


## 10. Phase 2: keeping it fresh automatically

Google Scholar is out of scope as a data source: it has no API, its robots.txt forbids automated access, and scrapers get IP-banned on CI runners. The site links to Scholar; it never reads from it.

Sources with stable free APIs: arXiv (by id), OpenAlex (by author id, no key, polite pool via `mailto`), Semantic Scholar (by author id, optional). Author disambiguation in OpenAlex/S2 is imperfect, which is why the job proposes and a human approves.

`src/data/sources.yaml`:

```yaml
orcid: 0009-0001-7397-9999
openalex_author_id: TODO(gab)      # Gab picks from the candidates the executor lists (§14 Q12)
semantic_scholar_author_id: null   # optional second source
mailto: gabriel@gensyn.ai          # OpenAlex polite pool
ignore: []                         # false positives: OpenAlex work ids or arXiv ids
```

`scripts/refresh.py` (Python 3.11+, `requests`, `pyyaml`, nothing else):

1. **Enrich**: one batched `http://export.arxiv.org/api/query?id_list=…` for every entry with `arxiv`. Overwrite nothing a human wrote (`year`, `venue`, `summary`, `links`, `selected`). Fill `authors` if empty. If arXiv now lists a DOI or `journal_ref` for an entry whose `venue` still says preprint, add a hint to the PR body.
2. **Discover**: `https://api.openalex.org/works?filter=authorships.author.id:{id}&per-page=50&sort=publication_year:desc&mailto={mailto}`. Match each work to existing entries by arXiv id, then DOI, then normalized title. Anything unmatched and not in `ignore` is appended to `papers.yaml` as `draft: true` with `summary: TODO`. Same for Semantic Scholar if configured (`https://api.semanticscholar.org/graph/v1/author/{id}/papers?fields=title,year,venue,externalIds&limit=100`).
3. **Propose**: if the file changed, open or update a single PR on branch `refresh/papers` via `peter-evans/create-pull-request`, titled "Papers refresh: N proposed, M hints". Gab reviews, writes the one-liner, flips `draft: false`, merges. Deploy runs on merge.
4. Never fail the deploy workflow: this is a separate workflow, `cron: '17 6 * * 1'` plus `workflow_dispatch`. If an API is down, skip it and say so in the PR body or job log.
5. Don't display citation counts. They drift and add nothing for this audience. (Storing them is harmless if wanted later.)

Rate limits are not a concern at this volume: arXiv asks for ≥ 3 s between requests (one request here); OpenAlex polite pool is generous; S2 allows 100 requests per 5 minutes unauthenticated.

## 11. Phase 3, if wanted

- `/cv` rendered from `papers.yaml` plus a small `cv.yaml` (positions, education, service), with a print stylesheet, so the CV can't drift from the papers list. (`curriculum_vitae.pdf` is gone, §14 Q11; nothing to alias.)
- `/papers` once the list passes ~10.
- Custom domain: buy it, add `public/CNAME`, set A/AAAA records per GitHub's docs, enable "Enforce HTTPS". Optional; the github.io URL is fine.
- Analytics: none by default. If wanted, GoatCounter's single script tag; nothing heavier.

## 12. Phase 1 acceptance

- `npm run build` passes; Actions deploys to https://gpandrade.github.io; the two kept PDF URLs resolve.
- Adding a paper means editing `src/data/papers.yaml` and nothing else; a malformed entry fails the build with a readable error.
- First-load transfer under 1 MB excluding videos; each video file ≤ 2 MB, `preload="metadata"`; no client-side JS shipped.
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
- Paper: append to src/data/papers.yaml (schema in src/content.config.ts). Required: id, title, authors, year, venue, one-sentence summary, and at least one of arxiv / doi / pdf. Author names from the arXiv API when an arXiv id exists.
- Writing: src/data/writing.yaml.
- Push to the default branch; Actions deploys in about a minute.

## Rules
- Never rename or remove files under public/ that predate the rebuild; they are linked externally.
- No media over 3 MB. Videos: webm + mp4 + poster, muted loop (docs/brief.md §6).
- One typeface (Newsreader), sentence case, no icons, cards, shadows, gradients, or client-side JS.
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
12. **OpenAlex id**: executor queries the authors endpoint by ORCID and by name, lists candidate profiles with their works, Gab picks; the id is recorded in `sources.yaml`. Nothing else is built for Phase 2 in this phase.
