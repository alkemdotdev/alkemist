import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, appendFile } from 'node:fs/promises';
import { directories, root } from './release.mjs';
const pending = (await readdir('.changeset')).some(
  (f) => f.endsWith('.md') && f !== 'README.md',
);
let versionChanged = false;
if (process.env.GITHUB_EVENT_NAME === 'workflow_dispatch')
  versionChanged = true;
else {
  const event = JSON.parse(
    await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'),
  );
  assert.match(event.before ?? '', /^[a-f0-9]{40}$/);
  if (/^0+$/.test(event.before)) versionChanged = true;
  else
    for (const directory of directories) {
      const file = `packages/${directory}/package.json`;
      const current = JSON.parse(await readFile(file, 'utf8'));
      const exists = execFileSync(
        'git',
        ['ls-tree', '--name-only', event.before, '--', file],
        { cwd: root, encoding: 'utf8' },
      ).trim();
      if (!exists) {
        versionChanged = true;
        continue;
      }
      const previous = JSON.parse(
        execFileSync('git', ['show', `${event.before}:${file}`], {
          cwd: root,
          encoding: 'utf8',
        }),
      );
      if (current.version !== previous.version) versionChanged = true;
    }
}
await appendFile(
  process.env.GITHUB_OUTPUT,
  `pending=${pending}\npublish=${!pending && versionChanged}\n`,
);
console.log(
  pending
    ? 'Prepare a version PR'
    : versionChanged
      ? 'Publish the versioned release'
      : 'No package version change; skip publication',
);
