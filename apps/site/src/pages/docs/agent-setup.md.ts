import { agentSetupGuide } from '../../lib/setup';

export function GET() {
  return new Response(agentSetupGuide(), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
