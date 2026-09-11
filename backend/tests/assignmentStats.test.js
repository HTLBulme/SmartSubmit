const { buildAssignmentStats } = require('../src/services/assignmentStats');

const assignment = (id = 1, classId = 10) => ({ id, classId });
const membership = (userId, classId = 10) => ({ userId, classId });
const submission = (studentId, assignmentId = 1, extra = {}) => ({
  studentId,
  assignmentId,
  ...extra,
});

function stats(assignments, memberships, submissions, assignmentId = 1) {
  return buildAssignmentStats(assignments, memberships, submissions).get(assignmentId);
}

describe('assignment submission statistics', () => {
  it('returns zero counts for an empty class', () => {
    expect(stats([assignment()], [], [])).toEqual({
      studentCount: 0,
      submittedCount: 0,
      missingCount: 0,
    });
  });

  it('counts every student as missing when there are no submissions', () => {
    expect(stats([assignment()], [membership(1), membership(2)], [])).toEqual({
      studentCount: 2,
      submittedCount: 0,
      missingCount: 2,
    });
  });

  it('counts a partially submitted class', () => {
    expect(stats(
      [assignment()],
      [membership(1), membership(2), membership(3)],
      [submission(2)],
    )).toEqual({ studentCount: 3, submittedCount: 1, missingCount: 2 });
  });

  it('counts a fully submitted class', () => {
    expect(stats(
      [assignment()],
      [membership(1), membership(2)],
      [submission(1), submission(2)],
    )).toEqual({ studentCount: 2, submittedCount: 2, missingCount: 0 });
  });

  it('counts one submission with multiple files as one student', () => {
    expect(stats(
      [assignment()],
      [membership(1)],
      [submission(1, 1, { files: ['one.pdf', 'two.pdf'] })],
    ).submittedCount).toBe(1);
  });

  it('does not count repeated submissions by the same student twice', () => {
    expect(stats(
      [assignment()],
      [membership(1), membership(2)],
      [submission(1), submission(1)],
    )).toEqual({ studentCount: 2, submittedCount: 1, missingCount: 1 });
  });

  it('does not double-count a user linked to multiple classes or duplicate rows', () => {
    const result = buildAssignmentStats(
      [assignment(1, 10), assignment(2, 20)],
      [membership(1, 10), membership(1, 10), membership(1, 20), membership(2, 20)],
      [submission(1, 1), submission(1, 2)],
    );

    expect(result.get(1)).toEqual({ studentCount: 1, submittedCount: 1, missingCount: 0 });
    expect(result.get(2)).toEqual({ studentCount: 2, submittedCount: 1, missingCount: 1 });
  });

  it('ignores submissions from users outside the assignment class', () => {
    expect(stats(
      [assignment()],
      [membership(1)],
      [submission(1), submission(99)],
    )).toEqual({ studentCount: 1, submittedCount: 1, missingCount: 0 });
  });
});
