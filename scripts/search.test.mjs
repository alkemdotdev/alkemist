import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, access, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildSearchIndex } from '../packages/astro/src/search.ts';

test('search indexes rendered pages and excludes redirects, errors, and non-pages', async () => {
  const root = await mkdtemp(join(tmpdir(), 'alkemist-search-'));
  try {
    const document =
      '<html lang="en"><body><main data-pagefind-body><h1>Oscillator</h1><p>Damped motion experiment.</p></main></body></html>';
    await mkdir(join(root, 'docs'));
    await writeFile(join(root, 'docs/index.html'), document);
    await writeFile(join(root, '404.html'), document);
    await writeFile(join(root, '500.html'), document);
    await writeFile(
      join(root, 'redirect.html'),
      document.replace(
        '<body>',
        '<head><meta http-equiv="refresh" content="0;url=/docs/"></head><body>',
      ),
    );
    await writeFile(
      join(root, 'fragment.html'),
      '<p>Not a generated page.</p>',
    );
    assert.equal(await buildSearchIndex(pathToFileURL(`${root}/`)), 1);
    await access(join(root, 'pagefind/pagefind.js'));
    await access(join(root, 'pagefind/pagefind-entry.json'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
