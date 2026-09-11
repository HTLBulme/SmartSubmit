const mockVerify = jest.fn().mockResolvedValue(true);
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'mock-message-id' });
const mockCreateTransport = jest.fn(() => ({
  verify: mockVerify,
  sendMail: mockSendMail,
}));

jest.mock('nodemailer', () => ({ createTransport: mockCreateTransport }));

const previousEmailEnvironment = {
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_PORT: process.env.EMAIL_PORT,
  EMAIL_SECURE: process.env.EMAIL_SECURE,
  EMAIL_USER: process.env.EMAIL_USER,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  EMAIL_PASS: process.env.EMAIL_PASS,
  EMAIL_FROM: process.env.EMAIL_FROM,
};

process.env.EMAIL_HOST = 'smtp.example.test';
process.env.EMAIL_PORT = '587';
process.env.EMAIL_SECURE = 'false';
process.env.EMAIL_USER = 'sender@example.test';
process.env.EMAIL_PASSWORD = 'test-only-password';
delete process.env.EMAIL_PASS;
process.env.EMAIL_FROM = 'SmartSubmit <sender@example.test>';

const {
  sendAssignmentReminder,
  sendGradeNotification,
  sendSubmissionConfirmation,
  verifyEmailTransport,
} = require('../src/app.email');

afterAll(() => {
  for (const [name, value] of Object.entries(previousEmailEnvironment)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

beforeEach(() => {
  mockVerify.mockClear();
  mockSendMail.mockClear();
  mockVerify.mockResolvedValue(true);
  mockSendMail.mockResolvedValue({ messageId: 'mock-message-id' });
});

describe('email infrastructure', () => {
  it('creates one STARTTLS transporter and verifies it without sending mail', async () => {
    expect(mockCreateTransport).toHaveBeenCalledWith({
      host: 'smtp.example.test',
      port: 587,
      secure: false,
      auth: {
        user: 'sender@example.test',
        pass: 'test-only-password',
      },
    });

    await expect(verifyEmailTransport()).resolves.toEqual({ success: true, configured: true });
    expect(mockVerify).toHaveBeenCalledTimes(1);
    expect(mockSendMail).not.toHaveBeenCalled();
  });

  it('uses the same mocked transporter for confirmations, grades and reminders', async () => {
    const submittedAt = new Date('2026-08-30T10:00:00.000Z');
    await expect(sendSubmissionConfirmation('student@example.test', 'Test Student', 'Task', submittedAt))
      .resolves.toMatchObject({ success: true });
    await expect(sendGradeNotification('student@example.test', 'Test Student', 'Task', 90, 'Gut'))
      .resolves.toMatchObject({ success: true });
    await expect(sendAssignmentReminder('student@example.test', 'Test Student', 'Task', submittedAt))
      .resolves.toMatchObject({ success: true });

    expect(mockCreateTransport).toHaveBeenCalledTimes(1);
    expect(mockSendMail).toHaveBeenCalledTimes(3);
  });

  it('returns safe SMTP diagnostics and redacts the configured password', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockSendMail.mockRejectedValueOnce({
      code: 'EAUTH',
      command: 'AUTH PLAIN',
      message: 'Authentication failed for test-only-password',
    });

    const result = await sendAssignmentReminder(
      'student@example.test',
      'Test Student',
      'Task',
      new Date('2026-08-30T10:00:00.000Z')
    );

    expect(result).toEqual({
      success: false,
      code: 'EAUTH',
      command: 'AUTH PLAIN',
      error: 'Authentication failed for [redacted]',
    });
    expect(consoleError).toHaveBeenCalledWith('❌ Assignment reminder failed:', {
      code: 'EAUTH',
      command: 'AUTH PLAIN',
      message: 'Authentication failed for [redacted]',
    });
    consoleError.mockRestore();
  });
});
