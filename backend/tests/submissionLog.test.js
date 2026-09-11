const mockPrisma = {
  submissionLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
}));

const {
  appendLogToZip,
  exportLogAsCSV,
  logSubmission,
} = require('../src/app.submissionLog');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('SubmissionLog persistence and export', () => {
  it('stores an explicit timestamp and submission IP for one file', async () => {
    const timestamp = new Date('2026-08-30T10:15:20.000Z');
    mockPrisma.submissionLog.create.mockResolvedValue({ id: 1 });

    await logSubmission({
      assignmentId: 4,
      studentName: 'Ada Lovelace',
      filename: 'Lösung 1.pdf',
      timestamp,
      ip: '192.0.2.10',
    });

    expect(mockPrisma.submissionLog.create).toHaveBeenCalledWith({
      data: {
        assignmentId: 4,
        studentName: 'Ada Lovelace',
        filename: 'Lösung 1.pdf',
        timestamp,
        ip: '192.0.2.10',
      },
    });
  });

  it('exports exact fields with CSV escaping and Unicode intact', async () => {
    mockPrisma.submissionLog.findMany.mockResolvedValue([
      {
        studentName: 'Zoë, Müller',
        filename: 'Lösung "final", Teil 1.pdf',
        timestamp: new Date('2026-08-30T10:15:20.000Z'),
        ip: '2001:db8::5',
      },
    ]);

    const csv = await exportLogAsCSV(9);

    expect(mockPrisma.submissionLog.findMany).toHaveBeenCalledWith({
      where: { assignmentId: 9 },
      orderBy: { timestamp: 'asc' },
    });
    expect(csv).toBe(
      'name,filename,timestamp,submissionIp\r\n' +
      '"Zoë, Müller","Lösung ""final"", Teil 1.pdf",2026-08-30T10:15:20.000Z,2001:db8::5\r\n'
    );
  });

  it('keeps identical filenames separated by assignment query', async () => {
    mockPrisma.submissionLog.findMany.mockImplementation(async ({ where }) => ([{
      studentName: where.assignmentId === 1 ? 'First Student' : 'Second Student',
      filename: 'answer.pdf',
      timestamp: new Date('2026-08-30T10:15:20.000Z'),
      ip: where.assignmentId === 1 ? '192.0.2.1' : '192.0.2.2',
    }]));

    const first = await exportLogAsCSV(1);
    const second = await exportLogAsCSV(2);

    expect(first).toContain('First Student,answer.pdf');
    expect(first).not.toContain('Second Student');
    expect(second).toContain('Second Student,answer.pdf');
    expect(second).not.toContain('First Student');
  });

  it('appends the exported log to a ZIP archive', async () => {
    mockPrisma.submissionLog.findMany.mockResolvedValue([]);
    const archive = { append: jest.fn() };

    const csv = await appendLogToZip(archive, 12);

    expect(archive.append).toHaveBeenCalledWith(csv, { name: 'submission_log.csv' });
    expect(csv).toBe('name,filename,timestamp,submissionIp\r\n');
  });
});
