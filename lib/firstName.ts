/**
 * Extracts the first word of profiles.full_name, exactly as typed (only
 * surrounding whitespace is trimmed — casing is never forced). Returns null
 * for a missing or empty name so a caller can fall back to a generic
 * greeting.
 */
export function firstName(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0];
}

/**
 * "Hi {name}," using firstName() above, or "Hi there," when there's no name
 * to greet by.
 */
export function greeting(fullName: string | null | undefined): string {
  const name = firstName(fullName);
  return name ? `Hi ${name},` : "Hi there,";
}
