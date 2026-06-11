import { defineCollection } from 'astro:content';
import { z } from 'astro:schema';
import { CATEGORIES } from './data/projects';
import { loadProjects } from './lib/projects-loader';

const localized = z.object({ fr: z.string(), en: z.string() });

const projects = defineCollection({
  // Build-time loader: curated list enriched from GitHub & npm.
  loader: async () => await loadProjects(),
  schema: z.object({
    title: z.string(),
    subtitle: localized,
    category: z.enum(CATEGORIES),
    github: z.string().url(),
    live: z.string().url().optional(),
    npm: z.string().url().optional(),
    download: z.object({ url: z.string().url(), tag: z.string() }).optional(),
    favicon: z.string().optional(),
    thumbnail: z.string().optional(),
    tech: z.array(z.string()).default([]),
    ai: z.object({ agent: z.string().nullable() }).nullable().default(null),
    stars: z.number().default(0),
    createdAt: z.string().nullable().default(null),
    updatedAt: z.string().nullable().default(null),
    featured: z.boolean().default(false),
    order: z.number().default(0),
  }),
});

export const collections = { projects };
