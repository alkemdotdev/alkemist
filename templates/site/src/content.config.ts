import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const entrySchema = z.object({
  title: z.string(),
  description: z.string(),
  draft: z.boolean().default(false),
});
const datedEntrySchema = entrySchema.extend({
  published: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const collections = {
  blog: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
    schema: datedEntrySchema,
  }),
  logs: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/logs' }),
    schema: datedEntrySchema,
  }),
  docs: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/docs' }),
    schema: entrySchema,
  }),
  book: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/book' }),
    schema: entrySchema.extend({ order: z.number().int().positive() }),
  }),
};
