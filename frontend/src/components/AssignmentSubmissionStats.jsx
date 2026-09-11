import React from "react";

function safeCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

export default function AssignmentSubmissionStats({
  studentCount,
  submittedCount,
  missingCount,
  submittedLabel,
  missingLabel,
}) {
  const total = safeCount(studentCount);
  const submitted = Math.min(safeCount(submittedCount), total);
  const missing = Math.min(safeCount(missingCount), total);

  return (
    <div className="assignment-submission-stats" aria-label={`${submittedLabel}: ${submitted} / ${total}; ${missingLabel}: ${missing}`}>
      <span
        className="assignment-submission-stat assignment-submission-stat-submitted"
        title={submittedLabel}
      >
        <span aria-hidden="true">✓</span> {submitted}
      </span>
      <span
        className="assignment-submission-stat assignment-submission-stat-missing"
        title={missingLabel}
      >
        <span aria-hidden="true">✕</span> {missing}
      </span>
    </div>
  );
}
