import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export const collections = {
  blog: defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
    schema: z.object({
      title: z.string(),
      description: z.string(),
      published: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      draft: z.boolean().default(false),
    }),
  }),
};
