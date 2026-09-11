import { describe, expect, it } from 'vitest';
import { formatSchoolYear } from '../src/utils/schoolYear.js';

describe('formatSchoolYear', () => {
  it.each([
    [2024, '2024/25'],
    [2025, '2025/26'],
    [2026, '2026/27'],
    ['2026/27', '2026/27'],
    ['2026-27', '2026/27'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatSchoolYear(input)).toBe(expected);
  });

  it.each([
    [null, null],
    [undefined, undefined],
    ['', ''],
    ['2026-2027', '2026-2027'],
    ['school year', 'school year'],
  ])('does not guess unknown value %s', (input, expected) => {
    expect(formatSchoolYear(input)).toBe(expected);
  });
});
