import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const entrySchema = z.object({
  title: z.string(),
  description: z.string(),
  present: z.boolean().default(false),
  draft: z.boolean().default(false),
});
const datedEntrySchema = entrySchema.extend({
  published: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
const slidesSchema = entrySchema.extend({
  format: z.enum(['deck', 'slides']),
  incremental: z.boolean().default(false),
  theme: z
    .enum(['inherit', 'default', 'paper', 'chalk', 'blueprint'])
    .default('inherit'),
  colorScheme: z
    .enum(['inherit', 'system', 'light', 'dark'])
    .default('inherit'),
  transition: z.enum(['none', 'fade', 'slide']).default('fade'),
  aspect: z.enum(['auto', '16:9', '4:3']).default('auto'),
  annotations: z.boolean().default(true),
  casting: z.boolean().default(false),
  class: z.string().optional(),
  style: z.string().optional(),
});
export const collections = {
  blog: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
    schema: ({ image }) =>
      datedEntrySchema.extend({
        cover: z
          .object({
            src: image(),
            alt: z.string().trim().min(1),
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
  slides: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/slides' }),
    schema: ({ image }) =>
      slidesSchema.extend({
        cover: z
          .object({
            src: image(),
            alt: z.string().trim().min(1),
            fit: z.enum(['cover', 'contain']).default('cover'),
            focalX: z.number().min(0).max(100).default(50),
            focalY: z.number().min(0).max(100).default(50),
          })
          .optional(),
      }),
  }),
};
