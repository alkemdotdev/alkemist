import type { APIRoute } from 'astro';
import { isPreview } from '../lib/deployment';
export const GET: APIRoute = () =>
  new Response(
    isPreview ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n',
    { headers: { 'Content-Type': 'text/plain' } },
  );
