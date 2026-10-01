import { defineCollection } from 'astro:content';
import { file } from 'astro/loaders';
import { z } from 'astro/zod';

// A bad entry fails the build with the field named in the error. That is the point.

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/, 'id: lowercase letters, digits, and hyphens');
const title = z.string().trim().min(1);
const httpUrl = z.string().url();
const localOrHttps = z
  .string()
  .regex(/^(\/\S*|https:\/\/\S+)$/, 'must be a local path starting with "/" or an https:// URL');

// YAML turns an unquoted full date into a Date object; accept either and keep a YYYY-MM or YYYY-MM-DD string.
const yearMonth = (what: string) =>
  z.preprocess(
    (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
    z.string().regex(/^\d{4}-\d{2}(-\d{2})?$/, `${what}: YYYY-MM or YYYY-MM-DD`),
  );

const link = z.object({ label: z.string().trim().min(1), url: httpUrl }).strict();

const paper = z
  .object({
    id,
    title,
    authors: z.array(z.string().trim().min(1)).min(1),
    year: z.number().int().min(1900).max(2100),
    /** Optional. Orders entries within a year, newest first: the venue or posting date, YYYY-MM or YYYY-MM-DD. */
    date: yearMonth('date').optional(),
    venue: z.string().trim().min(1),
    arxiv: z.string().regex(/^\d{4}\.\d{4,5}(v\d+)?$/, 'arxiv: an id like "2103.03405", quoted').optional(),
    doi: z.string().regex(/^10\.\d{4,9}\/\S+$/, 'doi: a bare DOI like 10.1145/3580507.3597714').nullish(),
    pdf: localOrHttps.nullish(),
    links: z.array(link).default([]),
    summary: z.string().trim().min(1).optional(),
    media: z
      .array(z.object({ src: z.string().regex(/^\/media\/[a-z0-9-]+$/, 'media src: "/media/<name>" without extension'), caption: z.string().trim().min(1) }).strict())
      .default([]),
    group: z.enum(['papers', 'earlier']).default('papers'),
    selected: z.boolean().default(false),
    draft: z.boolean().default(false),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.group === 'papers' && !p.summary) {
      ctx.addIssue({ code: 'custom', path: ['summary'], message: 'summary is required for group: papers' });
    }
    if (!p.arxiv && !p.doi && !p.pdf && p.links.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['links'], message: 'needs at least one of arxiv, doi, pdf, or links, so the title has somewhere to point' });
    }
  });

const writing = z
  .object({
    id,
    date: yearMonth('date'),
    title,
    outlet: z.string().trim().min(1),
    url: httpUrl,
  })
  .strict();

export const collections = {
  papers: defineCollection({ loader: file('src/data/papers.yaml'), schema: paper }),
  writing: defineCollection({ loader: file('src/data/writing.yaml'), schema: writing }),
};
