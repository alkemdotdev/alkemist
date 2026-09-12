import { defineConfig } from 'astro/config';
import alkemist from '@alkemdotdev/alkemist-astro';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { resolveDeployment } from './scripts/deployment.mjs';

if (existsSync('.env')) loadEnvFile('.env');
const deployment = resolveDeployment(process.env);

export default defineConfig({
  site: deployment.origin,
  base: deployment.base,
  output: 'static',
  trailingSlash: 'always',
  integrations: [alkemist()],
});
