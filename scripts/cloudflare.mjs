import { readFile } from 'node:fs/promises';
import {
  assertProjectIdentity,
  assertSubset,
  assertDnsRecord,
} from './cloudflare-contract.mjs';

const config = JSON.parse(
  await readFile(new URL('../infra/cloudflare.json', import.meta.url), 'utf8'),
);
const mode = process.argv[2] ?? 'status';
if (!['status', 'setup'].includes(mode))
  throw new Error('Use status or setup.');
if (!process.env.CLOUDFLARE_API_TOKEN)
  throw new Error(
    'CLOUDFLARE_API_TOKEN is required for operator access; never put it in the build environment.',
  );
const base = `/accounts/${config.account_id}/pages/projects`;
const projectPath = `${base}/${config.project.name}`;
async function api(endpoint, method = 'GET', body) {
  const response = await fetch(
    'https://api.cloudflare.com/client/v4' + endpoint,
    {
      method,
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
  const result = await response.json();
  if (!response.ok || !result.success) {
    const error = new Error(
      `${method} ${endpoint}: ${response.status} ${JSON.stringify(result.errors)}`,
    );
    error.httpStatus = response.status;
    throw error;
  }
  return result.result;
}
async function maybe(endpoint) {
  try {
    return await api(endpoint);
  } catch (error) {
    if (error.httpStatus === 404) return null;
    throw error;
  }
}
function summary(project, domains, records) {
  return {
    name: project.name,
    subdomain: project.subdomain,
    source: project.source,
    production_branch: project.production_branch,
    build_config: project.build_config,
    domains,
    records: records.map(({ id, type, name, content, proxied }) => ({
      id,
      type,
      name,
      content,
      proxied,
    })),
    deployments: [project.canonical_deployment, project.latest_deployment]
      .filter(Boolean)
      .map(
        ({
          id,
          url,
          environment,
          latest_stage,
          deployment_trigger,
          aliases,
        }) => ({
          id,
          url,
          environment,
          latest_stage,
          deployment_trigger,
          aliases,
        }),
      ),
  };
}
let project = await maybe(projectPath);
if (mode === 'setup') {
  if (project) {
    assertProjectIdentity(project, config.project);
    project = await api(projectPath, 'PATCH', config.project);
  } else project = await api(base, 'POST', config.project);
  project = await api(projectPath);
  assertProjectIdentity(project, config.project);
  assertSubset(project, config.project);
  console.log('Pages configuration verified against managed source.');
}
if (!project) {
  console.log(
    JSON.stringify({ project: config.project.name, status: 'not-created' }),
  );
  process.exit(0);
}
let domains = await api(`${projectPath}/domains`);
if (mode === 'setup' && !domains.some((d) => d.name === config.domain)) {
  await api(`${projectPath}/domains`, 'POST', { name: config.domain });
  domains = await api(`${projectPath}/domains`);
}
const dnsPath = `/zones/${config.zone_id}/dns_records`;
let records = await api(`${dnsPath}?name=${encodeURIComponent(config.domain)}`);
if (mode === 'setup') {
  for (const record of records)
    assertDnsRecord(record, config.domain, project.subdomain);
  if (records.length === 0)
    await api(dnsPath, 'POST', {
      type: 'CNAME',
      name: config.domain,
      content: project.subdomain,
      proxied: true,
      ttl: 1,
      comment: 'Managed by alkemdev/alkemist infra/cloudflare.json',
    });
  records = await api(`${dnsPath}?name=${encodeURIComponent(config.domain)}`);
  if (records.length !== 1)
    throw new Error('Expected exactly one Alkemist CNAME after setup.');
  assertDnsRecord(records[0], config.domain, project.subdomain);
}
console.log(JSON.stringify(summary(project, domains, records), null, 2));
