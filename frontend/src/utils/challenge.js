const NATO_WORDS = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliett', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'Xray', 'Yankee', 'Zulu'];
const NOUNS = ['Clearance', 'Authorization', 'Protocol', 'Safeguard', 'Relay', 'Beacon'];
const AUDIT_KEY = 'voicearmor.challenge.audit.v1';
const PHRASE_KEY = 'voicearmor.challenge.issued.v1';
export const issuedChallengePhrases = new Set();

export function normalizePhrase(value) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function levenshteinRatio(left, right) {
  if (!left && !right) return 1;
  if (!left || !right) return 0;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    let diagonal = previous[0];
    previous[0] = row;
    for (let column = 1; column <= right.length; column += 1) {
      const above = previous[column];
      previous[column] = Math.min(previous[column] + 1, previous[column - 1] + 1, diagonal + (left[row - 1] === right[column - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return 1 - previous[right.length] / Math.max(left.length, right.length);
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function createId() {
  return crypto.randomUUID ? crypto.randomUUID() : `challenge-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createChallenge(issuedPhrases) {
  try {
    JSON.parse(sessionStorage.getItem(PHRASE_KEY) || '[]').forEach((phrase) => issuedPhrases.add(phrase));
  } catch {
  }
  let phrase = '';
  do {
    phrase = `${randomItem(NATO_WORDS)} ${randomItem(NATO_WORDS)} ${String(Math.floor(Math.random() * 900) + 100)} ${randomItem(NOUNS)}`;
  } while (issuedPhrases.has(phrase));
  issuedPhrases.add(phrase);
  try {
    sessionStorage.setItem(PHRASE_KEY, JSON.stringify([...issuedPhrases]));
  } catch {
  }
  const issuedAt = Date.now();
  return { challengeId: createId(), phrase, issuedAt, expiresAt: issuedAt + 30000, attempts: 0 };
}

export async function hashAuditRecord(record) {
  const bytes = new TextEncoder().encode(JSON.stringify(record));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function readChallengeAudit() {
  try {
    return JSON.parse(sessionStorage.getItem(AUDIT_KEY) || '[]');
  } catch {
    return [];
  }
}

export function appendChallengeAudit(record) {
  const records = [...readChallengeAudit(), record];
  sessionStorage.setItem(AUDIT_KEY, JSON.stringify(records));
  window.dispatchEvent(new CustomEvent('voicearmor:challenge-audit', { detail: record }));
}

export function clearChallengeAudit() {
  sessionStorage.removeItem(AUDIT_KEY);
}