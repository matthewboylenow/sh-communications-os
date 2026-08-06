/**
 * Sortable, readable IDs. Time-prefixed so a raw database listing is in
 * creation order without a join, and short enough to paste into a Slack
 * message or read aloud on the phone.
 */
const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz"; // Crockford, no i l o u

export function createId(): string {
  const time = Date.now();
  let t = "";
  let n = time;
  while (n > 0) {
    t = ALPHABET[n % 32] + t;
    n = Math.floor(n / 32);
  }
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let r = "";
  for (const b of bytes) r += ALPHABET[b % 32];
  return `${t}${r}`;
}

export function prefixedId(prefix: string): string {
  return `${prefix}_${createId()}`;
}
