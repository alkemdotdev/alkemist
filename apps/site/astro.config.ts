import { defineConfig } from 'astro/config';
import alkemist from '@alkemist/astro';

export default defineConfig({
  site: 'https://alkemist.alkem.dev',
  output: 'static',
  trailingSlash: 'always',
  integrations: [alkemist()],
});
