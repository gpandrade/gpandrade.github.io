# gpandrade.github.io

Personal site of Gabriel P. Andrade, served at https://gpandrade.github.io.

Built with [Astro](https://astro.build): one page, one typeface, no client-side JavaScript beyond a reduced-motion toggle and a faint background texture. Content lives in YAML under `src/data/`; editing a file there and pushing to `master` is all it takes to publish. Deployment is by GitHub Actions (`.github/workflows/deploy.yml`).

- `src/data/papers.yaml`: papers and earlier work. Schema in `src/content.config.ts`; a bad entry fails the build.
- `src/data/writing.yaml`: posts elsewhere.
- `src/site.ts`: name, identity line, links row, bio, and the flags (`texture`, `textureVariant`, `textureIdle`, `videoFilter`, `loops`, `header`).
- `public/`: files served at the site root, including two PDFs that predate the rebuild and keep their URLs.
- `media-src/`: archive copies of the two dynamics videos; not deployed.
- `scripts/refresh.py`: the weekly papers refresh (`docs/brief.md` §10), run Mondays by `.github/workflows/refresh.yml`, which opens a pull request with new works as drafts.
- `docs/brief.md`: the full spec, including the design decisions.

Local development: `npm install`, then `npm run dev`. `npm run build` must pass before pushing template changes.

The site's HTML/CSS/JS is MIT licensed (see `LICENSE`); the papers, videos, and photo are not.
