const INTERNAL_EMAIL_DOMAIN = 'findhome.local'
const SAFE_LEGACY_USERNAME = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/

export function normalizeUsername(username: string) {
  return username.trim().normalize('NFKC')
}

function canonicalizeUsername(username: string) {
  return normalizeUsername(username).toLowerCase()
}

export function getLegacyInternalEmail(username: string) {
  return `${canonicalizeUsername(username)}@${INTERNAL_EMAIL_DOMAIN}`
}

export async function getInternalEmail(username: string) {
  const canonical = canonicalizeUsername(username)

  if (
    canonical.length <= 64 &&
    SAFE_LEGACY_USERNAME.test(canonical) &&
    !canonical.includes('..')
  ) {
    return `${canonical}@${INTERNAL_EMAIL_DOMAIN}`
  }

  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(canonical)
  )
  const hex = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('')

  return `u_${hex.slice(0, 40)}@${INTERNAL_EMAIL_DOMAIN}`
}
