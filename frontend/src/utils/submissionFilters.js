export function getSubmissionRosterCounts(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const submitted = list.filter((row) => row?.hasSubmitted).length;
  return { all: list.length, submitted, missing: list.length - submitted };
}

export function filterSubmissionRoster(rows, filter) {
  const list = Array.isArray(rows) ? rows : [];
  if (filter === "submitted") return list.filter((row) => row?.hasSubmitted);
  if (filter === "missing") return list.filter((row) => !row?.hasSubmitted);
  return list;
}
