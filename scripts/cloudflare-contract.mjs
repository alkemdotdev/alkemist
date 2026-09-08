export function assertProjectIdentity(actual, expected) {
  for (const key of ['owner', 'repo_name', 'repo_id']) {
    if (
      String(actual.source?.config?.[key]) !==
      String(expected.source.config[key])
    ) {
      throw new Error(
        `Pages repository identity differs at ${key}; refusing to repoint the project.`,
      );
    }
  }
}

export function assertSubset(actual, expected, keyPath = 'project') {
  for (const [key, value] of Object.entries(expected)) {
    const next = `${keyPath}.${key}`;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (!actual?.[key])
        throw new Error(`Missing ${next} in Cloudflare readback`);
      assertSubset(actual[key], value, next);
    } else if (JSON.stringify(actual?.[key]) !== JSON.stringify(value)) {
      throw new Error(`Cloudflare readback differs at ${next}`);
    }
  }
}

export function assertDnsRecord(record, domain, target) {
  if (
    record.name !== domain ||
    record.type !== 'CNAME' ||
    record.content !== target
  ) {
    throw new Error(
      `Existing DNS record for ${domain} is unrelated; refusing to overwrite it.`,
    );
  }
}
