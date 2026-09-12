import type { AstroIntegration } from 'astro';
import mdx, { type MdxOptions } from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  AlkCodeTheme,
  createAlkCodeTransformer,
  type AlkCodeOptions,
} from '@alkemdotdev/alkemist-components/code-theme';
import type { ShikiTransformer, ThemeRegistration } from 'shiki';

export interface AlkMdxOptions {
  /** Disable the bundled MDX integration when an existing site already owns it. */
  enabled?: boolean;
  options?: Partial<MdxOptions>;
}

export interface AlkMathOptions {
  /** Math is enabled by default. Secure KaTeX limits are intentionally fixed. */
  enabled?: boolean;
}

export interface AlkCodeIntegrationOptions extends AlkCodeOptions {
  /** Syntax highlighting is enabled by default. */
  enabled?: boolean;
  theme?: ThemeRegistration;
  transformers?: ShikiTransformer[];
  excludeLangs?: string[];
  wrap?: boolean;
}

export interface AlkOptions {
  mdx?: boolean | AlkMdxOptions;
  math?: boolean | AlkMathOptions;
  code?: boolean | AlkCodeIntegrationOptions;
  /** Opt in only when a site needs Alkemist's asset-file behavior. */
  vite?: { assetsInlineLimit?: number };
}

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
export default function alkemist(options: AlkOptions = {}): AstroIntegration {
  const mdxConfig: AlkMdxOptions =
    options.mdx === false
      ? { enabled: false }
      : options.mdx === true
        ? {}
        : (options.mdx ?? {});
  const math: AlkMathOptions =
    options.math === false
      ? { enabled: false }
      : options.math === true
        ? {}
        : (options.math ?? {});
  const code: AlkCodeIntegrationOptions =
    options.code === false
      ? { enabled: false }
      : options.code === true
        ? {}
        : (options.code ?? {});
  const mathEnabled = math.enabled ?? true;
  const codeEnabled = code.enabled ?? true;
  const mdxEnabled = mdxConfig.enabled ?? true;

  return {
    name: '@alkemdotdev/alkemist-astro',
    hooks: {
      'astro:config:setup': ({ updateConfig }) => {
        const markdown = {
          ...(mathEnabled
            ? {
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
              }
            : {}),
          ...(codeEnabled
            ? {
                syntaxHighlight: {
                  type: 'shiki' as const,
                  excludeLangs: code?.excludeLangs ?? ['math'],
                },
                shikiConfig: {
                  theme: code?.theme ?? AlkCodeTheme,
                  transformers: [
                    createAlkCodeTransformer(code),
                    ...(code?.transformers ?? []),
                  ],
                  wrap: code?.wrap ?? false,
                },
              }
            : {}),
        };
        updateConfig({
          ...(mdxEnabled ? { integrations: [mdx(mdxConfig.options)] } : {}),
          markdown,
          ...(options.vite?.assetsInlineLimit === undefined
            ? {}
            : {
                vite: {
                  build: { assetsInlineLimit: options.vite.assetsInlineLimit },
                },
              }),
        });
      },
    },
  };
}
