import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  escapeHtml,
  renderNavigation,
  renderPostList,
  renderSearch,
  renderTableOfContents,
} from '../packages/components/src/website-renderers.ts';

test('website renderers import and render without browser globals', () => {
  assert.equal(typeof globalThis.HTMLElement, 'undefined');
  assert.equal(typeof renderSearch, 'function');
  assert.match(renderSearch(), /data-index-url="\/pagefind\/pagefind\.js"/);
});

test('website renderer text, headings, and links stay in their intended HTML contexts', () => {
  assert.equal(
    escapeHtml(`<img src=x onerror='run()'>&\"`),
    '&lt;img src=x onerror=&#39;run()&#39;&gt;&amp;&quot;',
  );
  const toc = renderTableOfContents({
    label: '<img>',
    headings: [
      { depth: 1, slug: 'ignored', text: 'Ignored' },
      { depth: 2, slug: 'x y', text: '<script>' },
      { depth: 5, slug: 'also-ignored', text: 'Ignored' },
      { depth: 3, slug: ' ', text: 'Ignored' },
    ],
  });
  assert.match(toc, /aria-label="&lt;img&gt;"/);
  assert.match(toc, /href="#x%20y"/);
  assert.match(toc, /&lt;script&gt;/);
  assert.doesNotMatch(toc, /ignored|<script>/);

  const navigation = renderNavigation({
    currentPath: '/guide/#intro',
    items: [
      { label: '<Guide>', href: '/guide/' },
      { label: 'Unsafe', href: 'javascript:alert(1)' },
    ],
  });
  assert.match(navigation, /&lt;Guide&gt;/);
  assert.match(navigation, /href="\/guide\/" aria-current="page"/);
  assert.doesNotMatch(navigation, /javascript:/);
  assert.match(navigation, /<span>Unsafe<\/span>/);
});

test('search accepts only a local Pagefind module URL and escapes supplied text', () => {
  const search = renderSearch({
    indexUrl: ' https://attacker.example/pagefind.js ',
    label: '<label>',
    placeholder: '" autofocus onfocus="run()',
  });
  assert.match(search, /data-index-url="\/pagefind\/pagefind\.js"/);
  assert.match(search, /aria-label="&lt;label&gt;"/);
  assert.match(search, /placeholder="&quot; autofocus onfocus=&quot;run\(\)"/);
  assert.doesNotMatch(search, /attacker\.example|onfocus="run/);
});

test('post list keeps a single featured lead, validates URLs, and keeps safe layout controls', () => {
  const posts = renderPostList({
    layout: 'featured-grid',
    selectable: true,
    featuredHref: '/lead/',
    label: '<Posts>',
    items: [
      {
        href: '/other/',
        title: '<Other>',
        description: 'ordinary',
        cover: {
          src: '/covers/other.svg',
          alt: '<cover>',
          focalX: Number.NaN,
          focalY: Number.POSITIVE_INFINITY,
        },
      },
      {
        href: '/lead/',
        title: 'Lead',
        description: '<script>',
        cover: {
          src: 'javascript:alert(1)',
          alt: 'bad',
          focalX: Number.NaN,
          focalY: Number.POSITIVE_INFINITY,
        },
      },
      { href: 'data:text/html,boom', title: 'Unsafe', description: 'blocked' },
    ],
  });
  assert.match(posts, /data-layout="featured-grid"/);
  assert.match(posts, /<option value="featured-grid" selected>/);
  assert.match(posts, /aria-label="&lt;Posts&gt; layout"/);
  assert.equal((posts.match(/data-lead/g) ?? []).length, 1);
  assert.ok(posts.indexOf('<h2>Lead</h2>') < posts.indexOf('&lt;Other&gt;'));
  assert.match(posts, /href="#"/);
  assert.doesNotMatch(posts, /javascript:|<script>|onerror=/);
  assert.match(posts, /--alk-post-focal-x: 50%; --alk-post-focal-y: 50%/);
});

test('extracted global component styles do not contain generic element selectors', async () => {
  const root = new URL('../packages/components/src/', import.meta.url);
  const sources = await Promise.all(
    ['navigation.astro', 'table-of-contents.astro', 'post-list.astro'].map(
      (file) => readFile(new URL(file, root), 'utf8'),
    ),
  );
  for (const source of sources) {
    assert.doesNotMatch(source, /\n\s*(?:body|html|\*)\s*(?:[,{])/);
  }
});
