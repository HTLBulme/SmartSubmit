const { prisma } = require('./app.config');

async function logSubmission({ studentName, filename, ip, assignmentId }) {
  await prisma.submissionLog.create({
    data: { studentName, filename, ip, assignmentId }
  });
}

async function exportLogAsCSV(assignmentId) {
  const logs = await prisma.submissionLog.findMany({
    where: { assignmentId },
    orderBy: { timestamp: 'asc' }
  });

  const header = 'name|filename|timestamp|submissionIP\n';
  const rows = logs.map(l => 
    `${l.studentName}|${l.filename}|${l.timestamp.toISOString()}|${l.ip}`
  ).join('\n');

  return header + rows;
}

module.exports = { logSubmission, exportLogAsCSV };