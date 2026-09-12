import { defineConfig } from 'astro/config';
import alkemist from '@alkemdotdev/alkemist-astro';
import { redirects } from './redirects.mjs';
import { writeFile } from 'node:fs/promises';

export default defineConfig({
  site: 'https://alkemist.alkem.dev',
  output: 'static',
  trailingSlash: 'always',
  redirects,
  integrations: [
    alkemist(),
    {
      name: 'alkemist-site-redirects',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          const rules = Object.entries(redirects).flatMap(([from, to]) => [
            `${from} ${to} 301`,
            `${from.slice(0, -1)} ${to} 301`,
          ]);
          await writeFile(new URL('_redirects', dir), rules.join('\n') + '\n');
        },
      },
    },
  ],
});
