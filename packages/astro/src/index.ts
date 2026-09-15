import type { AstroIntegration } from 'astro';
import mdx, { type MdxOptions as AstroMdxOptions } from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  codeTheme,
  createCodeTransformer,
  type CodeOptions,
} from '@alkemdotdev/alkemist-components/code-theme';
import type { ShikiTransformer, ThemeRegistration } from 'shiki';
import { buildSearchIndex } from './search.ts';
import { rehypeAlkemistSlides, remarkAlkemistSlides } from './slides.ts';

export interface MdxOptions {
  /** Disable the bundled MDX integration when an existing site already owns it. */
  enabled?: boolean;
  options?: Partial<AstroMdxOptions>;
}

export interface MathOptions {
  /** Math is enabled by default. Secure KaTeX limits are intentionally fixed. */
  enabled?: boolean;
}

export interface CodeIntegrationOptions extends CodeOptions {
  /** Syntax highlighting is enabled by default. */
  enabled?: boolean;
  theme?: ThemeRegistration;
  transformers?: ShikiTransformer[];
  excludeLangs?: string[];
}

export interface IntegrationOptions {
  /** Generate a static Pagefind index from rendered pages. Opt in per site. */
  search?: boolean;
  mdx?: boolean | MdxOptions;
  math?: boolean | MathOptions;
  code?: boolean | CodeIntegrationOptions;
  /** Enable Markdown-first presentations and shared callouts/diagrams. */
  presentations?: boolean;
  /** Compatibility alias for presentations. */
  slides?: boolean;
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
export default function alkemist(
  options: IntegrationOptions = {},
): AstroIntegration {
  const mdxConfig: MdxOptions =
    options.mdx === false
      ? { enabled: false }
      : options.mdx === true
        ? {}
        : (options.mdx ?? {});
  const math: MathOptions =
    options.math === false
      ? { enabled: false }
      : options.math === true
        ? {}
        : (options.math ?? {});
  const code: CodeIntegrationOptions =
    options.code === false
      ? { enabled: false }
      : options.code === true
        ? {}
        : (options.code ?? {});
  const mathEnabled = math.enabled ?? true;
  const codeEnabled = code.enabled ?? true;
  const mdxEnabled = mdxConfig.enabled ?? true;
  if (
    options.presentations !== undefined &&
    options.slides !== undefined &&
    options.presentations !== options.slides
  )
    throw new Error(
      'presentations and slides must agree when both are supplied.',
    );
  const slidesEnabled = (options.presentations ?? options.slides) === true;
  const remarkPlugins: any[] = [
    ...(mathEnabled ? [remarkMath] : []),
    ...(slidesEnabled ? [remarkAlkemistSlides] : []),
  ];
  const rehypePlugins: any[] = [
    ...(mathEnabled
      ? [
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
        ]
      : []),
    ...(slidesEnabled ? [rehypeAlkemistSlides] : []),
  ];

  return {
    name: '@alkemdotdev/alkemist-astro',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        if (options.search) {
          const pages = await buildSearchIndex(dir);
          logger.info(`Indexed ${pages} pages for search.`);
        }
      },
      'astro:config:setup': ({ updateConfig, injectScript }) => {
        // Fences and equations must work in an adopting site's own layout.
        if (codeEnabled || mathEnabled)
          injectScript(
            'page-ssr',
            'import "@alkemdotdev/alkemist-theme/math-code.css";',
          );
        if (codeEnabled)
          injectScript(
            'page',
            'import "@alkemdotdev/alkemist-components/code-copy";',
          );
        if (slidesEnabled) {
          injectScript(
            'page-ssr',
            'import "@alkemdotdev/alkemist-theme/slides.css";',
          );
          injectScript(
            'page',
            'import "@alkemdotdev/alkemist-components/diagram-client";',
          );
        }
        const markdown = {
          ...(remarkPlugins.length || rehypePlugins.length
            ? {
                processor: unified({ remarkPlugins, rehypePlugins }),
              }
            : {}),
          ...(codeEnabled
            ? {
                syntaxHighlight: {
                  type: 'shiki' as const,
                  excludeLangs: [
                    ...(code?.excludeLangs ?? ['math']),
                    ...(slidesEnabled ? ['mermaid'] : []),
                  ].filter(
                    (language, index, languages) =>
                      languages.indexOf(language) === index,
                  ),
                },
                shikiConfig: {
                  theme: code?.theme ?? codeTheme,
                  transformers: [
                    createCodeTransformer(code),
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
