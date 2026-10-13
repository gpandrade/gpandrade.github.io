# gpandrade.github.io

Personal site. Astro 7, deployed by .github/workflows/deploy.yml to GitHub Pages. Full spec in docs/brief.md.

## Adding content
- Paper: add to src/data/papers.yaml (schema in src/content.config.ts). Required: id, title, authors, year, venue, one-sentence summary, and at least one of arxiv / doi / pdf / links. Optional `date` (YYYY-MM or YYYY-MM-DD) orders entries within a year, newest first. Author names from the arXiv API when an arXiv id exists; the owner's name renders as "Gabriel P. Andrade" wherever `authorMatch` hits.
- Writing: src/data/writing.yaml.
- Push to the default branch (master); Actions deploys in about a minute. A malformed entry fails the build with the field named.

## Rules
- Never rename or remove MSRIREUPaperZ.pdf or seminaryear1_deptnewsletter.pdf under public/; they are linked externally.
- No media over 3 MB, except the archive copies in media-src/, which are never deployed. Videos: webm + mp4 + poster, muted loop (docs/brief.md §6).
- One typeface (Newsreader), sentence case, no icons, cards, shadows, gradients. No client-side JS beyond the two exemptions in docs/brief.md §3 (reduced-motion toggle, texture layer).
- Flags in src/site.ts: `texture` (background layer on/off), `textureVariant` (`conservative` | `full`), `textureIdle`, `videoFilter` (`hue` | `none` | `invert`), and `loops` (`pair` | `lorenz`: where the dynamics loops sit). Each has a `PUBLIC_*` env override for review builds.
- Run `npm run build` before pushing template changes.
- Review material (screenshots, recordings, Lighthouse reports) goes in the session scratchpad, not the repo.
