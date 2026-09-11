/**
 * Formats the school-year value for display without changing the stored value.
 * Known legacy values are normalized; unknown values are returned unchanged.
 */
export function formatSchoolYear(value) {
  if (value === null || value === undefined) return value;

  const original = String(value);
  const normalized = original.trim();
  if (!normalized) return original;

  if (/^\d{4}\/\d{2}$/.test(normalized)) return normalized;

  const hyphenated = normalized.match(/^(\d{4})-(\d{2})$/);
  if (hyphenated) return `${hyphenated[1]}/${hyphenated[2]}`;

  const singleYear = normalized.match(/^(\d{4})$/);
  if (singleYear) {
    const startYear = Number(singleYear[1]);
    return `${singleYear[1]}/${String((startYear + 1) % 100).padStart(2, "0")}`;
  }

  return original;
}
