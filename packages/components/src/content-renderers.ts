import katex from 'katex';
import type { BundledLanguage } from 'shiki';
import {
  codeTheme,
  createCodeTransformer,
  type CodeOptions,
} from './code-theme.ts';
export { renderNativeContent } from './native-content-renderer.ts';
export type {
  NativeContentKind,
  NativeContentValues,
  NativeHtmlValues,
  NativeImageValues,
  NativeMediaValues,
} from './native-content-renderer.ts';

export interface MathRendererProps {
  tex: string;
  display?: boolean;
  label?: string;
}
export type MathProps = MathRendererProps;

export interface CodeRendererProps extends CodeOptions {
  code: string;
  lang?: BundledLanguage | 'text' | 'plaintext';
}
export type CodeProps = CodeRendererProps;

/** Typeset TeX with the same bounded, untrusted KaTeX configuration as Math. */
export function renderMath(props: MathRendererProps): string {
  const html = katex.renderToString(props.tex, {
    displayMode: props.display ?? true,
    output: 'htmlAndMathml',
    trust: false,
    throwOnError: true,
    strict: 'error',
    maxExpand: 1000,
    maxSize: 20,
  });
  if (props.display === false)
    return `<span class="alk-math-inline">${html}</span>`;
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      (char) =>
        ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        })[char]!,
    );
  const label = escape(props.label ?? 'Mathematical equation');
  return `<figure class="alk-math"><div class="alk-math-scroll" tabindex="0" role="group" aria-label="${label}">${html}</div>${props.label ? `<figcaption>${escape(props.label)}</figcaption>` : ''}</figure>`;
}

/** Highlight source on demand so importing a playground does not load Shiki until Code is selected. */
export async function renderCode(props: CodeRendererProps): Promise<string> {
  const { codeToHtml } = await import('shiki');
  return codeToHtml(props.code, {
    lang: props.lang ?? 'text',
    theme: codeTheme,
    transformers: [
      createCodeTransformer({
        ...props,
        lineNumbers: props.lineNumbers ?? true,
      }),
    ],
  });
}
