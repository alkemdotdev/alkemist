import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative, sep } from 'node:path';
import * as pagefind from 'pagefind';

/** Index only rendered content pages, excluding redirects and error documents. */
export async function buildSearchIndex(directory: URL): Promise<number> {
  const root = fileURLToPath(directory);
  const { index, errors } = await pagefind.createIndex({
    excludeSelectors: ['.katex', 'button', 'input', 'select', 'textarea'],
  });
  if (!index || errors.length) throw new Error(errors.join('\n'));
  let pages = 0;
  const checked = (errors: string[]) => {
    if (errors.length)
      throw new Error(`Search indexing failed: ${errors.join('\n')}`);
  };
  try {
    for (const entry of await readdir(root, {
      recursive: true,
      withFileTypes: true,
    })) {
      if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
      const file = join(entry.parentPath, entry.name);
      const sourcePath = relative(root, file).split(sep).join('/');
      if (/(^|\/)(404|500)(\/index)?\.html$/.test(sourcePath)) continue;
      const content = await readFile(file, 'utf8');
      if (
        !/<main\b/i.test(content) ||
        /http-equiv=["']refresh["']/i.test(content) ||
        /<[a-z][^>]*\sdata-alk-search-exclude(?:\s|=|>)/i.test(content)
      )
        continue;
      const result = await index.addHTMLFile({ sourcePath, content });
      checked(result.errors);
      pages++;
    }
    if (!pages)
      throw new Error('Search is enabled but no content pages were generated.');
    checked(
      (await index.writeFiles({ outputPath: join(root, 'pagefind') })).errors,
    );
    return pages;
  } finally {
    await index.deleteIndex();
    await pagefind.close();
  }
}
