const HOSTNAME_LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

function hasValidHostname(hostname: string): boolean {
  if (hostname.length === 0 || hostname.length > 253) {
    return false;
  }

  if (hostname.startsWith('[') && hostname.endsWith(']')) {
    return true;
  }

  return hostname
    .split('.')
    .every((label) => HOSTNAME_LABEL_PATTERN.test(label));
}

export function validateSafeEcommerceUrl(value: string): string {
  const normalized = value.trim();

  if (
    normalized.length === 0 ||
    !/^https:\/\//i.test(normalized) ||
    /[\s\\]/.test(normalized)
  ) {
    throw new Error('Catalog product ecommerceUrl must be a safe HTTPS URL');
  }

  let parsed: URL;

  try {
    parsed = new URL(normalized);
  } catch {
    throw new Error('Catalog product ecommerceUrl must be a safe HTTPS URL');
  }

  if (
    parsed.protocol !== 'https:' ||
    !hasValidHostname(parsed.hostname) ||
    parsed.username.length > 0 ||
    parsed.password.length > 0
  ) {
    throw new Error('Catalog product ecommerceUrl must be a safe HTTPS URL');
  }

  return normalized;
}
