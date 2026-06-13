import { defineCollection } from 'astro:content';
import { z } from 'astro:schema';
import { CATEGORIES } from './data/projects';
import { CACHE_PATH } from './lib/cache';
import { loadProjects } from './lib/projects-loader';

const localized = z.object({ fr: z.string(), en: z.string() });

const projects = defineCollection({
  // Object loader so dev can watch the cache: it isn't in Vite's module graph
  // (read via fs), so a plain loader wouldn't reload when `make fetch` rewrites it.
  loader: {
    name: 'projects',
    load: async ({ store, parseData, watcher, logger }) => {
      async function populate() {
        store.clear();
        for (const entry of loadProjects()) {
          const data = await parseData({
            id: entry.id,
            data: entry as unknown as Record<string, unknown>,
          });
          store.set({ id: entry.id, data });
        }
      }
      await populate();
      watcher?.add(CACHE_PATH);
      watcher?.on('change', async (path) => {
        if (path.endsWith('projects-cache.json')) {
          logger.info('projects-cache.json changed - reloading projects');
          await populate();
        }
      });
    },
  },
  schema: z.object({
    id: z.string(),
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
    wip: z.boolean().default(false),
    discord: z.boolean().default(false),
    stars: z.number().default(0),
    createdAt: z.string().nullable().default(null),
    updatedAt: z.string().nullable().default(null),
  }),
});

export const collections = { projects };
