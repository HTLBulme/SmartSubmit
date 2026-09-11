const { buildSubmissionRoster } = require('../src/services/submissionRoster');

const student = (id, firstName = `Student${id}`, lastName = 'Test') => ({
  user: { id, firstName, lastName, email: `student${id}@example.com` }
});
const submission = (studentId, id = studentId) => ({
  id,
  assignmentId: 10,
  studentId,
  submittedAt: new Date('2026-08-30T10:00:00.000Z'),
  files: [],
  text: '',
  grade: null,
  feedback: null,
});

describe('submission roster', () => {
  it('shows every student as missing when nobody submitted', () => {
    const result = buildSubmissionRoster([student(1), student(2)], []);
    expect(result.counts).toEqual({ all: 2, submitted: 0, missing: 2 });
    expect(result.roster.every((row) => row.status === 'missing' && row.id === null)).toBe(true);
  });

  it('merges one Submission into a roster with several students', () => {
    const result = buildSubmissionRoster([student(1), student(2), student(3)], [submission(2)]);
    expect(result.counts).toEqual({ all: 3, submitted: 1, missing: 2 });
    expect(result.roster.find((row) => row.studentId === 2)).toMatchObject({
      id: 2,
      status: 'submitted',
      hasSubmitted: true,
    });
  });

  it('shows every student as submitted when all submitted', () => {
    const result = buildSubmissionRoster(
      [student(1), student(2)],
      [submission(1), submission(2)],
    );
    expect(result.counts).toEqual({ all: 2, submitted: 2, missing: 0 });
  });

  it('deduplicates a student represented by repeated membership rows', () => {
    const result = buildSubmissionRoster([student(1), student(1)], [submission(1)]);
    expect(result.counts).toEqual({ all: 1, submitted: 1, missing: 0 });
    expect(result.roster).toHaveLength(1);
  });

  it('ignores a Submission from a user outside the relevant class roster', () => {
    const result = buildSubmissionRoster([student(1)], [submission(1), submission(99)]);
    expect(result.roster).toHaveLength(1);
    expect(result.roster[0].studentId).toBe(1);
  });
});
