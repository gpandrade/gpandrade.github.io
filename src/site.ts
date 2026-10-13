// Site-wide values. Everything here is either in the header, the <head>, or JSON-LD.
export const site = {
  name: 'Gabriel P. Andrade',
  role: 'Researcher at Gensyn, working on information markets and the mechanisms behind them.',
  /** One sentence under the name. No affiliation; the bio carries that. */
  identity: 'Researcher working on information markets, mechanism design, and multi-agent systems.',
  portraitAlt: 'Gabriel P. Andrade and his cat Sadie',
  jobTitle: 'Researcher',
  affiliation: { name: 'Gensyn', url: 'https://www.gensyn.ai/' },
  teamPage: 'https://www.gensyn.ai/team/gabriel-andrade',
  researchPage: 'https://www.gensyn.ai/research',
  description:
    'Researcher at Gensyn working on information markets, mechanism design, information elicitation, and multi-agent systems.',
  url: 'https://gpandrade.github.io',
  repo: 'https://github.com/gpandrade/gpandrade.github.io',
  email: 'gabriel@gensyn.ai',
  twitter: '@gab_p_andrade',
  orcid: 'https://orcid.org/0009-0001-7397-9999',
  /** Which author string to embolden in author lists. */
  authorMatch: /Andrade/,
  links: [
    { label: 'Email', url: 'mailto:gabriel@gensyn.ai' },
    { label: 'Google Scholar', url: 'https://scholar.google.com/citations?user=reI4hTYAAAAJ' },
    { label: 'X', url: 'https://x.com/gab_p_andrade' },
    { label: 'GitHub', url: 'https://github.com/gpandrade' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/gpandrade' },
  ],
  bio: [
    'I work at [Gensyn](https://www.gensyn.ai/research) on information markets: mechanisms that pay people and models to reveal what they know, and the multi-agent systems that take shape once many strategic participants trade on the result. Most of my work sits where mechanism design, information elicitation, and multi-agent learning intersect.',
    'Before Gensyn I was an Applied Scientist at Amazon, working on fraud and bad-actor detection. I received my PhD in computer science from the University of Colorado Boulder in 2022, advised by Rafael Frongillo and Joshua Grochow, where I studied the dynamics of learning in games. Before that, I did an MS in applied mathematics at UMass Amherst.',
  ],
  /** Treatment of the video loops. 'hue' re-colours the red-orange trajectories onto the accent hue in both
   *  schemes; 'none' leaves them; 'invert' is hue-matched in light and inverted to a dark field in dark mode. */
  videoFilter: ((import.meta.env.PUBLIC_VIDEO_FILTER as string | undefined) ?? 'invert') as 'hue' | 'none' | 'invert',
  /** The one decorative element: a faint tessellation behind the page, warped by learning dynamics as you scroll. */
  texture: import.meta.env.PUBLIC_TEXTURE !== 'off',
  /** 'conservative': the kagome, stirred by scroll. 'full': the drawn edge set also transforms along the page,
   *  kagome at the top, triangular through the middle, honeycomb at the bottom. */
  textureVariant: ((import.meta.env.PUBLIC_TEXTURE_VARIANT as string | undefined) ?? 'full') as 'conservative' | 'full',
  /** Slow drift while nothing is scrolling (one cycle per two minutes); the frame loop otherwise idles. */
  textureIdle: import.meta.env.PUBLIC_TEXTURE_IDLE !== 'off',
  /** Where the dynamics loops live. 'pair': both loops in a figure under the header and the paper keeps a "Loops"
   *  link. 'lorenz': one larger Lorenz loop under the header; the Chua loop stays in the paper. */
  loops: ((import.meta.env.PUBLIC_LOOPS as string | undefined) ?? 'pair') as 'pair' | 'lorenz',
  /** How the portrait sits from 720px. 'grid': a column beside the name block, the header row growing to the
   *  portrait's height. 'float': floated right across the header and the start of About, which then precedes the
   *  loops figure so its heading and first paragraph wrap beside the portrait. */
  header: ((import.meta.env.PUBLIC_HEADER as string | undefined) ?? 'grid') as 'grid' | 'float',
} as const;
