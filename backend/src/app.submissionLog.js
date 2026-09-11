const { prisma } = require('./app.config');

async function logSubmission({ studentName, filename, ip, assignmentId, timestamp }, db = prisma) {
  return db.submissionLog.create({
    data: { studentName, filename, ip, assignmentId, timestamp }
  });
}

function escapeCsv(value) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function exportLogAsCSV(assignmentId, db = prisma) {
  const logs = await db.submissionLog.findMany({
    where: { assignmentId },
    orderBy: { timestamp: 'asc' }
  });

  const header = 'name,filename,timestamp,submissionIp\r\n';
  const rows = logs.map((log) => [
    log.studentName,
    log.filename,
    log.timestamp,
    log.ip,
  ].map(escapeCsv).join(',')).join('\r\n');

  return header + rows + (rows ? '\r\n' : '');
}

async function appendLogToZip(archive, assignmentId, db = prisma) {
  const csv = await exportLogAsCSV(assignmentId, db);
  archive.append(csv, { name: 'submission_log.csv' });
  return csv;
}

module.exports = { appendLogToZip, escapeCsv, exportLogAsCSV, logSubmission };
