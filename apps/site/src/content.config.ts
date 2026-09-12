import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const schema = z.object({
  title: z.string(),
  description: z.string(),
  order: z.number().default(100),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  draft: z.boolean().default(false),
});
const logsSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  draft: z.boolean().default(false),
});
const bookSchema = z.object({
  title: z.string(),
  description: z.string(),
  order: z.number().int().positive(),
  draft: z.boolean().default(false),
});
export const collections = {
  docs: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/docs' }),
    schema,
  }),
  blog: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
    schema,
  }),
  logs: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/logs' }),
    schema: logsSchema,
  }),
  book: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/book' }),
    schema: bookSchema,
  }),
};
