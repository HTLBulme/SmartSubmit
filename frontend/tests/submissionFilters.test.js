import { describe, expect, it } from 'vitest';
import {
  filterSubmissionRoster,
  getSubmissionRosterCounts,
} from '../src/utils/submissionFilters';

const roster = [
  { studentId: 10, hasSubmitted: true },
  { studentId: 11, hasSubmitted: false },
  { studentId: 12, hasSubmitted: true },
];

describe('submission roster filters', () => {
  it('counts all, submitted and missing students', () => {
    expect(getSubmissionRosterCounts(roster)).toEqual({
      all: 3,
      submitted: 2,
      missing: 1,
    });
  });

  it('supports all, submitted and missing filters', () => {
    expect(filterSubmissionRoster(roster, 'all')).toEqual(roster);
    expect(filterSubmissionRoster(roster, 'submitted').map((row) => row.studentId)).toEqual([10, 12]);
    expect(filterSubmissionRoster(roster, 'missing').map((row) => row.studentId)).toEqual([11]);
  });

  it('handles an empty roster', () => {
    expect(getSubmissionRosterCounts([])).toEqual({ all: 0, submitted: 0, missing: 0 });
    expect(filterSubmissionRoster([], 'missing')).toEqual([]);
  });
});
