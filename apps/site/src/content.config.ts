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
const slidesSchema = z.object({
  title: z.string(),
  description: z.string(),
  format: z.literal('slides'),
  incremental: z.boolean().default(false),
  draft: z.boolean().default(false),
});
export const collections = {
  docs: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/docs' }),
    schema,
  }),
  blog: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/blog' }),
    schema: ({ image }) =>
      schema.extend({
        cover: z
          .object({
            src: image(),
            alt: z.string().min(1),
            caption: z.string().optional(),
            fit: z.enum(['cover', 'contain']).default('cover'),
            focalX: z.number().min(0).max(100).default(50),
            focalY: z.number().min(0).max(100).default(50),
            showInPost: z.boolean().default(true),
          })
          .optional(),
      }),
  }),
  logs: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/logs' }),
    schema: logsSchema,
  }),
  book: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/book' }),
    schema: bookSchema,
  }),
  slides: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/slides' }),
    schema: slidesSchema,
  }),
};
