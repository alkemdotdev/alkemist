import type { AstroIntegration } from 'astro';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';

/** Shared defaults stay in the package so site content survives upgrades. */
export default function alkemist(): AstroIntegration {
  return {
    name: '@alkemist/astro',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          integrations: [mdx()],
          markdown: { processor: unified() },
          vite: { build: { assetsInlineLimit: 0 } },
        });
      },
    },
  };
}
