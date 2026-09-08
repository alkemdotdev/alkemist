import type { APIRoute } from 'astro';
import { execFileSync } from 'node:child_process';
import { isPreview } from '../lib/deployment';
function revision() {
  if (process.env.CF_PAGES_COMMIT_SHA) return process.env.CF_PAGES_COMMIT_SHA;
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'uncommitted';
  }
}
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      project: 'alkemist',
      version: '0.1.0',
      commit: revision(),
      branch: process.env.CF_PAGES_BRANCH ?? 'local',
      environment: isPreview ? 'preview' : 'production',
      builtAt: new Date().toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
