import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  assertProjectIdentity,
  assertSubset,
  assertDnsRecord,
} from './cloudflare-contract.mjs';
const { project, domain } = JSON.parse(
  await readFile(new URL('../infra/cloudflare.json', import.meta.url), 'utf8'),
);

test('readback rejects an ignored repository rebind', () => {
  const actual = structuredClone(project);
  actual.source.config.repo_id = 'old-repository';
  assert.throws(() => assertProjectIdentity(actual, project), /repo_id/);
});
test('readback permits an owner rename only when the immutable owner ID matches', () => {
  const actual = structuredClone(project);
  actual.source.config.owner = 'alkemdev';
  assert.doesNotThrow(() => assertProjectIdentity(actual, project));
  assert.doesNotThrow(() => assertSubset(actual, project));

  actual.source.config.owner_id = 'different-owner';
  assert.throws(() => assertProjectIdentity(actual, project), /owner_id/);
});
test('readback detects disabled previews and allows provider-added fields', () => {
  assert.doesNotThrow(() =>
    assertSubset({ ...project, id: 'server-assigned' }, project),
  );
  const actual = structuredClone(project);
  actual.source.config.preview_deployment_setting = 'none';
  assert.throws(
    () => assertSubset(actual, project),
    /preview_deployment_setting/,
  );
});
test('DNS setup refuses unrelated records', () => {
  assert.throws(
    () =>
      assertDnsRecord(
        { name: domain, type: 'A', content: '192.0.2.1' },
        domain,
        'alkemist.pages.dev',
      ),
    /refusing/,
  );
  assert.doesNotThrow(() =>
    assertDnsRecord(
      { name: domain, type: 'CNAME', content: 'alkemist.pages.dev' },
      domain,
      'alkemist.pages.dev',
    ),
  );
});
test('only main is production and all other repository branches are eligible', () => {
  assert.equal(project.production_branch, 'main');
  assert.equal(project.source.config.production_deployments_enabled, true);
  assert.equal(project.source.config.preview_deployment_setting, 'all');
  assert.equal(project.source.config.pr_comments_enabled, false);
});
