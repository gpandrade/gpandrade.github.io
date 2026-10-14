# gpandrade.github.io

Personal site. Astro 7, deployed by .github/workflows/deploy.yml to GitHub Pages. Full spec in docs/brief.md.

## Adding content
- Paper: add to src/data/papers.yaml (schema in src/content.config.ts). Required: id, title, authors, year, venue, one-sentence summary, and at least one of arxiv / doi / pdf / links. Optional `date` (YYYY-MM or YYYY-MM-DD) orders entries within a year, newest first. Author names from the arXiv API when an arXiv id exists; the owner's name renders as "Gabriel P. Andrade" wherever `authorMatch` hits.
- Writing: src/data/writing.yaml.
- Push to the default branch (master); Actions deploys in about a minute. A malformed entry fails the build with the field named.
- Weekly refresh: .github/workflows/refresh.yml runs scripts/refresh.py (Mondays 06:17 UTC, or Actions → Papers refresh → Run workflow) and opens one PR on `refresh/papers` with unmatched OpenAlex works appended as `draft: true` entries, plus DOI hints in the PR body. Review there: write the summary, set `draft: false`, merge within the week (the next run regenerates the branch from master). False positives go in `ignore` in src/data/sources.yaml. Locally: `pip install -r scripts/requirements.txt && python scripts/refresh.py --dry-run`.

## Rules
- Never rename or remove MSRIREUPaperZ.pdf or seminaryear1_deptnewsletter.pdf under public/; they are linked externally.
- No media over 3 MB, except the archive copies in media-src/ (the source videos and the original portrait), which are never deployed. Videos: webm + mp4 + poster, muted loop (docs/brief.md §6).
- One typeface (Newsreader), sentence case, no icons, cards, shadows, gradients. No client-side JS beyond the exemptions in docs/brief.md: the reduced-motion toggle and the texture layer (§3), and the easter egg (§17, nodes in §19 and §20), which loads on demand and draws original geometry only.
- Flags in src/site.ts: `texture` (background layer on/off), `textureVariant` (`conservative` | `full`), `textureIdle`, `videoFilter` (`hue` | `none` | `invert`), `loops` (`pair` | `lorenz`: where the dynamics loops sit), `egg` (the easter egg, docs/brief.md §17, §19 and §20) and `nodeRest` (`ink` | `tint`: the egg's nodes at rest). Each has a `PUBLIC_*` env override for review builds. The nodes' density numbers are `nodes` in the same file (§20).
- Run `npm run build` before pushing template changes, and `node scripts/probe-nodes.mjs dist` after anything that moves the layout or the egg's nodes: CI runs that probe before every deploy and a node over text, a link or media blocks it (§20).
- Review material (screenshots, recordings, Lighthouse reports) goes in the session scratchpad, not the repo.
