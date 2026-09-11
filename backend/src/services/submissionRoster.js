function buildSubmissionRoster(studentMemberships, submissions) {
  const students = new Map();
  for (const membership of studentMemberships || []) {
    const student = membership?.user;
    if (student && Number.isInteger(student.id)) students.set(student.id, student);
  }

  const submissionsByStudent = new Map();
  for (const submission of submissions || []) {
    if (students.has(submission.studentId) && !submissionsByStudent.has(submission.studentId)) {
      submissionsByStudent.set(submission.studentId, submission);
    }
  }

  const roster = [...students.values()]
    .sort((a, b) => {
      const lastName = String(a.lastName || '').localeCompare(String(b.lastName || ''), 'de');
      return lastName || String(a.firstName || '').localeCompare(String(b.firstName || ''), 'de');
    })
    .map((student) => {
      const submission = submissionsByStudent.get(student.id);
      if (submission) {
        return {
          ...submission,
          studentId: student.id,
          student,
          hasSubmitted: true,
          status: 'submitted',
        };
      }
      return {
        id: null,
        assignmentId: null,
        studentId: student.id,
        submittedAt: null,
        grade: null,
        feedback: null,
        text: '',
        files: [],
        student,
        hasSubmitted: false,
        status: 'missing',
      };
    });

  const submitted = roster.filter((row) => row.hasSubmitted).length;
  return {
    roster,
    counts: {
      all: roster.length,
      submitted,
      missing: roster.length - submitted,
    },
  };
}

module.exports = { buildSubmissionRoster };
