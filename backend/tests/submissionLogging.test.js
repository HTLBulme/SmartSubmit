const mockPrisma = {
  role: { findFirst: jest.fn() },
  userRole: { findFirst: jest.fn() },
  assignment: { findUnique: jest.fn() },
  userClass: { findFirst: jest.fn() },
  submission: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  submissionLog: { create: jest.fn() },
  user: { findUnique: jest.fn() },
  $transaction: jest.fn(async (callback) => callback(mockPrisma)),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));
jest.mock('../src/app.email', () => ({
  sendSubmissionConfirmation: jest.fn().mockResolvedValue({ success: true, messageId: 'mock-mail' }),
  sendGradeNotification: jest.fn().mockResolvedValue({ success: true, messageId: 'mock-mail' }),
}));

const { submitAssignment } = require('../src/controllers/student.controller');

function responseMock() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function file(name, index = 1) {
  return {
    originalname: name,
    filename: `stored-${index}`,
    mimetype: 'application/pdf',
    size: 100 + index,
    path: `backend/uploads/submissions/stored-${index}`,
  };
}

function requestMock(files, overrides = {}) {
  return {
    userId: 1,
    body: { assignmentId: '10', text: '' },
    files,
    ip: '198.51.100.40',
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  };
}

function prepareSubmission({ existing = null, student } = {}) {
  mockPrisma.role.findFirst.mockResolvedValue({ id: 1 });
  mockPrisma.userRole.findFirst.mockResolvedValue({ id: 1 });
  mockPrisma.assignment.findUnique.mockResolvedValue({
    id: 10,
    title: 'Assignment',
    classId: 5,
    dueDate: new Date('2099-01-01T00:00:00.000Z'),
  });
  mockPrisma.userClass.findFirst.mockResolvedValue({ id: 1 });
  mockPrisma.user.findUnique.mockResolvedValue(student || {
    firstName: 'Natalia',
    lastName: 'Schüler',
    email: 'student@example.com',
  });
  mockPrisma.submission.findFirst.mockResolvedValue(existing);
  mockPrisma.submission.create.mockResolvedValue({ id: 20 });
  mockPrisma.submission.update.mockResolvedValue({ id: existing?.id || 20 });
  mockPrisma.submissionLog.create.mockResolvedValue({ id: 1 });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (callback) => callback(mockPrisma));
});

describe('per-file logging during student submission', () => {
  it('logs one uploaded file with student, timestamp and request IP', async () => {
    prepareSubmission();
    const res = responseMock();

    await submitAssignment(requestMock([file('Lösung mit Leerzeichen.pdf')]), res);

    expect(res.body.success).toBe(true);
    expect(mockPrisma.submissionLog.create).toHaveBeenCalledTimes(1);
    const log = mockPrisma.submissionLog.create.mock.calls[0][0].data;
    const savedSubmission = mockPrisma.submission.create.mock.calls[0][0].data;
    expect(log).toMatchObject({
      assignmentId: 10,
      studentName: 'Natalia Schüler',
      filename: 'Lösung mit Leerzeichen.pdf',
      ip: '198.51.100.40',
    });
    expect(log.timestamp).toBeInstanceOf(Date);
    expect(log.timestamp).toBe(savedSubmission.submittedAt);
  });

  it('creates one independent log row for every file in a multi-file upload', async () => {
    prepareSubmission();
    const res = responseMock();

    await submitAssignment(requestMock([
      file('first.pdf', 1),
      file('zweite Lösung.pdf', 2),
      file('third.pdf', 3),
    ]), res);

    expect(res.body.success).toBe(true);
    expect(mockPrisma.submissionLog.create).toHaveBeenCalledTimes(3);
    expect(mockPrisma.submissionLog.create.mock.calls.map((call) => call[0].data.filename))
      .toEqual(['first.pdf', 'zweite Lösung.pdf', 'third.pdf']);
  });

  it('updates an existing Submission and appends new history rows', async () => {
    prepareSubmission();
    mockPrisma.submission.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 44 });
    mockPrisma.submission.create.mockResolvedValue({ id: 44 });

    await submitAssignment(requestMock([file('original.pdf')]), responseMock());
    const replacementResponse = responseMock();
    await submitAssignment(requestMock([file('replacement.pdf', 2)]), replacementResponse);

    expect(replacementResponse.body.message).toBe('Submission updated');
    expect(mockPrisma.submission.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 44 },
    }));
    expect(mockPrisma.submissionLog.create).toHaveBeenCalledTimes(2);
    expect(mockPrisma.submissionLog.create.mock.calls.map((call) => call[0].data.filename))
      .toEqual(['original.pdf', 'replacement.pdf']);
  });

  it('does not mix student or assignment data for identical filenames', async () => {
    prepareSubmission({ student: { firstName: 'First', lastName: 'Student', email: 'first@example.com' } });
    await submitAssignment(requestMock([file('answer.pdf')]), responseMock());

    prepareSubmission({ student: { firstName: 'Second', lastName: 'Student', email: 'second@example.com' } });
    mockPrisma.assignment.findUnique.mockResolvedValue({
      id: 11,
      title: 'Other Assignment',
      classId: 6,
      dueDate: new Date('2099-01-01T00:00:00.000Z'),
    });
    await submitAssignment(requestMock([file('answer.pdf')], {
      userId: 2,
      body: { assignmentId: '11', text: '' },
      ip: '198.51.100.41',
    }), responseMock());

    const logs = mockPrisma.submissionLog.create.mock.calls.map((call) => call[0].data);
    expect(logs).toEqual(expect.arrayContaining([
      expect.objectContaining({ assignmentId: 10, studentName: 'First Student', ip: '198.51.100.40' }),
      expect.objectContaining({ assignmentId: 11, studentName: 'Second Student', ip: '198.51.100.41' }),
    ]));
  });
});
