import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const schema = z.object({
  title: z.string(),
  description: z.string(),
  order: z.number().default(100),
  date: z.string().optional(),
});
export const collections = {
  docs: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/docs' }),
    schema,
  }),
  notebook: defineCollection({
    loader: glob({ pattern: '**/*.mdx', base: './src/content/notebook' }),
    schema,
  }),
};
