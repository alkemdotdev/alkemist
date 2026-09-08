import type { APIRoute } from 'astro';
import { execFileSync } from 'node:child_process';
import { resolveDeployment } from '../../scripts/deployment.mjs';
import { siteName } from '../lib/site';
const deployment = resolveDeployment(process.env);
function revision() {
  if (deployment.commit) return deployment.commit;
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
      project: siteName,
      commit: revision(),
      branch: deployment.branch,
      environment: deployment.environment,
      base: deployment.base,
      builtAt: new Date().toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
