export function assertProjectIdentity(actual, expected) {
  for (const key of ['repo_name', 'repo_id']) {
    if (
      String(actual.source?.config?.[key]) !==
      String(expected.source.config[key])
    ) {
      throw new Error(
        `Pages repository identity differs at ${key}; refusing to repoint the project.`,
      );
    }
  }

  const actualOwnerId = actual.source?.config?.owner_id;
  const expectedOwnerId = expected.source.config.owner_id;
  if (expectedOwnerId !== undefined) {
    if (String(actualOwnerId) !== String(expectedOwnerId)) {
      throw new Error(
        'Pages repository identity differs at owner_id; refusing to repoint the project.',
      );
    }
    return;
  }

  if (String(actual.source?.config?.owner) !== String(expected.source.config.owner)) {
    throw new Error(
      'Pages repository identity differs at owner; refusing to repoint the project.',
    );
  }
}

export function assertSubset(actual, expected, keyPath = 'project') {
  for (const [key, value] of Object.entries(expected)) {
    const next = `${keyPath}.${key}`;
    const isProviderOwnerNameDrift =
      next === 'project.source.config.owner' &&
      expected.owner_id !== undefined &&
      String(actual?.owner_id) === String(expected.owner_id);
    if (isProviderOwnerNameDrift) continue;
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
