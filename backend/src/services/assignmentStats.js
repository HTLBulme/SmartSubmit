function addToSetMap(map, key, value) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

function buildAssignmentStats(assignments, studentMemberships, submissions) {
  const studentsByClass = new Map();
  for (const membership of studentMemberships || []) {
    addToSetMap(studentsByClass, membership.classId, membership.userId);
  }

  const submittedStudentsByAssignment = new Map();
  for (const submission of submissions || []) {
    addToSetMap(submittedStudentsByAssignment, submission.assignmentId, submission.studentId);
  }

  return new Map((assignments || []).map((assignment) => {
    const relevantStudents = studentsByClass.get(assignment.classId) || new Set();
    const submittedStudents = submittedStudentsByAssignment.get(assignment.id) || new Set();
    let submittedCount = 0;

    for (const studentId of submittedStudents) {
      if (relevantStudents.has(studentId)) submittedCount += 1;
    }

    const studentCount = relevantStudents.size;
    return [assignment.id, {
      studentCount,
      submittedCount,
      missingCount: Math.max(0, studentCount - submittedCount),
    }];
  }));
}

module.exports = { buildAssignmentStats };
