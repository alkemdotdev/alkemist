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
    schema: ({ image }) =>
      slidesSchema.extend({
        cover: z
          .object({
            src: image(),
            alt: z.string().min(1),
            fit: z.enum(['cover', 'contain']).default('cover'),
            focalX: z.number().min(0).max(100).default(50),
            focalY: z.number().min(0).max(100).default(50),
          })
          .optional(),
      }),
  }),
};
