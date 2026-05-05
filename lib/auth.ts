export function isAllowedEmail(email: string, allowlistCsv: string | undefined): boolean {
  if (!allowlistCsv) return false;
  const normalized = email.trim().toLowerCase();
  const allowed = allowlistCsv
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(normalized);
}
