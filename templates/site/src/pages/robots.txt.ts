import type { APIRoute } from 'astro';
import { resolveDeployment } from '../../scripts/deployment.mjs';
export const GET: APIRoute = () =>
  new Response(
    resolveDeployment(process.env).preview
      ? 'User-agent: *\nDisallow: /\n'
      : 'User-agent: *\nAllow: /\n',
    { headers: { 'Content-Type': 'text/plain' } },
  );
