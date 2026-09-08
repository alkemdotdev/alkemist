import type { AstroIntegration } from 'astro';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  AlkCodeTheme,
  createAlkCodeTransformer,
} from '@alkemist/ui/code-theme';

/** rehype-katex records parse failures instead of throwing; published math must be valid. */
function failInvalidMath() {
  return (
    _tree: unknown,
    file: Parameters<ReturnType<typeof rehypeKatex>>[1],
  ) => {
    const error = file.messages.find(
      (message) => message.source === 'rehype-katex',
    );
    if (error) file.fail(error);
  };
}

/** Shared defaults stay in the package so site content survives upgrades. */
export default function alkemist(): AstroIntegration {
  return {
    name: '@alkemist/astro',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        updateConfig({
          integrations: [mdx()],
          markdown: {
            processor: unified({
              remarkPlugins: [remarkMath],
              rehypePlugins: [
                [
                  rehypeKatex,
                  {
                    output: 'htmlAndMathml',
                    trust: false,
                    strict: 'error',
                    maxExpand: 1000,
                    maxSize: 20,
                  },
                ],
                failInvalidMath,
              ],
            }),
            syntaxHighlight: { type: 'shiki', excludeLangs: ['math'] },
            shikiConfig: {
              theme: AlkCodeTheme,
              transformers: [createAlkCodeTransformer()],
              wrap: false,
            },
          },
          vite: { build: { assetsInlineLimit: 0 } },
        });
      },
    },
  };
}
