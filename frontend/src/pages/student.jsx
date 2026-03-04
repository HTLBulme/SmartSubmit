import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import { useState, useEffect } from "react";
import axios from "axios";
import "./student.css";

const API_URL = import.meta.env.VITE_API_URL || "";

function titleCaseWords(value) {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const [first, ...rest] = word;
      if (!first) return "";
      return first.toLocaleUpperCase() + rest.join("").toLocaleLowerCase();
    })
    .join(" ");
}

function getFriendlyName(userData) {
  const raw = localStorage.getItem("user");
  let storedUser = null;
  try {
    storedUser = raw ? JSON.parse(raw) : null;
  } catch {
    storedUser = null;
  }

  const vorname = storedUser?.vorname ?? userData?.vorname;
  const nachname = storedUser?.nachname ?? userData?.nachname;
  const email = storedUser?.email ?? userData?.email;

  const fullName = [vorname, nachname].filter(Boolean).join(" ");
  if (fullName.trim()) return titleCaseWords(fullName);

  if (userData?.name) return titleCaseWords(userData.name);

  if (typeof email === "string" && email.includes("@")) {
    return titleCaseWords(email.split("@")[0].replace(/[._-]+/g, " "));
  }

  return "Student";
}

export default function StudentDashboard() {
  const [lang] = useLang();
  const t = T[lang] || T.en;
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedAssignmentId, setExpandedAssignmentId] = useState(null);
  const [submitText, setSubmitText] = useState("");
  const [submitFiles, setSubmitFiles] = useState([]);
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOver, setIsOver] = useState(false);

  const getAttachmentUrl = (attachment) => {
    if (!attachment) return null;

    if (typeof attachment === "string") {
      // seed may contain '/uploads/...' already
      if (attachment.startsWith("/uploads/")) return attachment;
      return null;
    }

    if (typeof attachment === "object") {
      // teacher uploads: { originalName, filename, path, ... }
      if (typeof attachment.url === "string" && attachment.url.startsWith("/")) {
        return attachment.url;
      }
      if (typeof attachment.filename === "string" && attachment.filename.trim() !== "") {
        return `/uploads/assignments/${attachment.filename}`;
      }
      if (typeof attachment.storedName === "string" && attachment.storedName.trim() !== "") {
        return `/uploads/assignments/${attachment.storedName}`;
      }
      if (typeof attachment.path === "string") {
        const normalized = attachment.path.replace(/\\/g, "/");
        const idx = normalized.lastIndexOf("/uploads/");
        if (idx !== -1) return normalized.slice(idx);
      }
    }

    return null;
  };

  const getAttachmentLabel = (attachment) => {
    if (!attachment) return "";
    if (typeof attachment === "string") {
      try {
        return decodeURIComponent(attachment.split("/").pop() || attachment);
      } catch {
        return attachment.split("/").pop() || attachment;
      }
    }
    if (typeof attachment === "object") {
      return attachment.originalName || attachment.filename || attachment.storedName || "File";
    }
    return "";
  };

  const getSubmissionFileUrl = (fileMeta) => {
    if (!fileMeta) return null;

    if (typeof fileMeta === "string") {
      if (fileMeta.startsWith("/uploads/")) return fileMeta;
      return null;
    }

    if (typeof fileMeta === "object") {
      if (typeof fileMeta.url === "string" && fileMeta.url.startsWith("/")) {
        return fileMeta.url;
      }

      const stored =
        (typeof fileMeta.storedName === "string" && fileMeta.storedName.trim())
          ? fileMeta.storedName
          : (typeof fileMeta.filename === "string" && fileMeta.filename.trim())
            ? fileMeta.filename
            : null;

      if (stored) return `/uploads/submissions/${stored}`;

      if (typeof fileMeta.path === "string") {
        const normalized = fileMeta.path.replace(/\\/g, "/");
        const idx = normalized.lastIndexOf("/uploads/");
        if (idx !== -1) return normalized.slice(idx);
      }
    }

    return null;
  };

  const getSubmissionFileLabel = (fileMeta) => {
    if (!fileMeta) return "";
    if (typeof fileMeta === "string") return getAttachmentLabel(fileMeta);
    if (typeof fileMeta === "object") {
      return (
        fileMeta.originalName ||
        fileMeta.filename ||
        fileMeta.storedName ||
        "File"
      );
    }
    return "";
  };

  const fetchStudentData = async ({ showLoading } = { showLoading: true }) => {
    if (showLoading) setLoading(true);
    setError("");
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) {
        setError(t.fetchError || "Not authenticated");
        return;
      }

      const [assignmentsRes, submissionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/student/assignments`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_URL}/api/student/submissions`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const assignmentsRaw = assignmentsRes?.data?.data ?? [];
      const submissionsRaw = submissionsRes?.data?.data ?? [];

      const submissionByAssignmentId = new Map(
        submissionsRaw
          .filter((row) => row && typeof row.aufgabe_id === "number")
          .map((row) => [row.aufgabe_id, row])
      );

      const getSubmission = (assignmentId) =>
        submissionByAssignmentId.get(assignmentId) || null;

      const assignments = assignmentsRaw.map((assignment) => {
        const submission = getSubmission(assignment.id);
        const submitted = Boolean(submission);
        const gradeValue = submission?.grade ?? null;

        let submittedFiles = [];
        const rawSubmittedFiles = submission?.dateien;
        if (Array.isArray(rawSubmittedFiles)) {
          submittedFiles = rawSubmittedFiles;
        } else if (typeof rawSubmittedFiles === "string" && rawSubmittedFiles.trim() !== "") {
          try {
            const parsed = JSON.parse(rawSubmittedFiles);
            submittedFiles = Array.isArray(parsed) ? parsed : [];
          } catch {
            submittedFiles = [];
          }
        }

        let attachments = [];
        if (
          typeof assignment.anhaenge === "string" &&
          assignment.anhaenge.trim() !== ""
        ) {
          try {
            attachments = JSON.parse(assignment.anhaenge);
          } catch {
            attachments = [];
          }
        }

        return {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          dueDate: assignment.dueDate,
          submitted,
          gradeValue,
          feedback: submission?.feedback ?? null,
          submissionTime: submission?.submissionTime ?? null,
          submittedText: submission?.text ?? "",
          submittedFiles,
          attachments,
        };
      });

      const rawUser = localStorage.getItem("user");
      let storedUser = null;
      try {
        storedUser = rawUser ? JSON.parse(rawUser) : null;
      } catch {
        storedUser = null;
      }

      setUserData({
        ...(storedUser || {}),
        assignments,
        grades: [],
      });
    } catch (err) {
      setError(t.fetchError || "Error loading student data");
      console.error("Error fetching student data:", err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      try {
        await fetchStudentData({ showLoading: true });
      } finally {
        // no-op
      }
    };

    run();
  }, [t]);

  useEffect(() => {
    setSubmitText("");
    setSubmitFiles([]);
    setSubmitMessage("");
    setIsOver(false);
  }, [expandedAssignmentId]);

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    setSubmitFiles((prev) => {
      const map = new Map(prev.map((f) => [`${f.name}_${f.size}`, f]));
      for (const f of incoming) map.set(`${f.name}_${f.size}`, f);
      return Array.from(map.values());
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  };

  const handleSubmitWork = async (assignmentId) => {
    setSubmitMessage("");
    setIsSubmitting(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      if (!token) {
        setSubmitMessage(t.fetchError || "Not authenticated");
        return;
      }
      const fd = new FormData();
      fd.append("assignmentId", String(assignmentId));
      fd.append("text", submitText);
      submitFiles.forEach((file) => fd.append("files", file));

      const res = await axios.post(`${API_URL}/api/student/submit`, fd, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setSubmitMessage(res?.data?.message || (t.submitSuccess || "Submitted"));
      await fetchStudentData({ showLoading: false });
    } catch (err) {
      const backendMessage = err?.response?.data?.message;
      setSubmitMessage(backendMessage || t.submitError || "Submit failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">{t.loading || "Loading..."}</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="student-dashboard">
      <header className="dashboard-header">
        <h1>
          {(t.welcome || "Welcome").trim()} {getFriendlyName(userData)}
        </h1>
      </header>

      <div className="dashboard-content">
        <div className="assignments">
          <h2>{t.myAssignments}</h2>
          <div className="assignments-list">
            {userData?.assignments?.map((assignment) => (
              <div key={assignment.id} className="assignment-item">
                <div className="assignment-info">
                  <div className="assignment-title">{assignment.title}</div>
                  <div className="assignment-due">
                    {t.dueDate}: {new Date(assignment.dueDate).toLocaleDateString()}
                  </div>
                  <div className="assignment-grade">
                    <strong>{t.grade || "Grade"}:</strong>{" "}
                    {assignment.submitted
                      ? assignment.gradeValue ?? (t.pendingGrade || "Pending")
                      : "—"}
                  </div>
                </div>

                {(() => {
                  const due = new Date(assignment.dueDate);
                  const isOverdue = !assignment.submitted && !Number.isNaN(due.getTime()) && due < new Date();
                  const statusClass = assignment.submitted
                    ? "status-submitted"
                    : isOverdue
                      ? "status-not-submitted"
                      : "status-active";
                  const statusText = assignment.submitted
                    ? t.submitted
                    : isOverdue
                      ? (t.overdue || "Overdue")
                      : (t.active || "Active");

                  return (
                    <span className={`assignment-status ${statusClass}`}>
                      {statusText}
                    </span>
                  );
                })()}

                <button
                  type="button"
                  className="view-details-btn"
                  onClick={() =>
                    setExpandedAssignmentId((current) =>
                      current === assignment.id ? null : assignment.id
                    )
                  }
                >
                  {expandedAssignmentId === assignment.id
                    ? (t.hideDetails || "Hide details")
                    : t.viewDetails}
                </button>

                {expandedAssignmentId === assignment.id && (
                  <div className="assignment-details">
                    {assignment.description && (
                      <div className="assignment-details-row">
                        <div className="assignment-details-label">{t.textLbl || "Description"}</div>
                        <div className="assignment-details-value">{assignment.description}</div>
                      </div>
                    )}

                    {Array.isArray(assignment.attachments) && assignment.attachments.length > 0 && (
                      <div className="assignment-details-row">
                        <div className="assignment-details-label">{t.filesLbl || "Files"}</div>
                        <div className="assignment-details-value">
                          <ul className="attachment-list">
                            {assignment.attachments.map((att, idx) => {
                              const url = getAttachmentUrl(att);
                              const label = getAttachmentLabel(att);
                              const href = url ? `${API_URL}${url}` : null;

                              return (
                                <li key={`${assignment.id}-att-${idx}`} className="attachment-item">
                                  {href ? (
                                    <a href={href} target="_blank" rel="noreferrer">
                                      {label}
                                    </a>
                                  ) : (
                                    <span>{label}</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    )}

                    {assignment.submitted && assignment.submissionTime && (
                      <div className="assignment-details-row">
                        <div className="assignment-details-label">{t.submitted || "Submitted"}</div>
                        <div className="assignment-details-value">
                          {new Date(assignment.submissionTime).toLocaleString()}
                        </div>
                      </div>
                    )}

                    {assignment.submitted && (
                      <>
                        {typeof assignment.submittedText === "string" && assignment.submittedText.trim() !== "" && (
                          <div className="assignment-details-row">
                            <div className="assignment-details-label">{t.submittedText || "Your text"}</div>
                            <div className="assignment-details-value">{assignment.submittedText}</div>
                          </div>
                        )}

                        {Array.isArray(assignment.submittedFiles) && assignment.submittedFiles.length > 0 && (
                          <div className="assignment-details-row">
                            <div className="assignment-details-label">{t.submittedFiles || "Your files"}</div>
                            <div className="assignment-details-value">
                              <ul className="attachment-list">
                                {assignment.submittedFiles.map((f, idx) => {
                                  const url = getSubmissionFileUrl(f);
                                  const label = getSubmissionFileLabel(f);
                                  const href = url ? `${API_URL}${url}` : null;

                                  return (
                                    <li key={`${assignment.id}-subm-${idx}`} className="attachment-item">
                                      {href ? (
                                        <a href={href} target="_blank" rel="noreferrer">
                                          {label}
                                        </a>
                                      ) : (
                                        <span>{label}</span>
                                      )}
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {assignment.feedback && (
                      <div className="assignment-details-row">
                        <div className="assignment-details-label">{t.feedback || "Feedback"}</div>
                        <div className="assignment-details-value">{assignment.feedback}</div>
                      </div>
                    )}

                    {(() => {
                      const due = new Date(assignment.dueDate);
                      const isActive = !Number.isNaN(due.getTime()) && due >= new Date();

                      if (!isActive) {
                        return (
                          <div className="submission-closed">
                            {t.submissionClosed || "Submission closed"}
                          </div>
                        );
                      }

                      return (
                        <div className="submission-form">
                          <div className="submission-form-title">
                            {t.submitWork || "Submit work"}
                          </div>

                          <textarea
                            className="submission-text"
                            rows={3}
                            value={submitText}
                            placeholder={t.textLbl || "Text"}
                            onChange={(e) => setSubmitText(e.target.value)}
                          />

                          <div
                            className={`student-dnd-zone ${isOver ? "over" : ""}`}
                            onDragOver={(e) => {
                              e.preventDefault();
                              setIsOver(true);
                            }}
                            onDragLeave={() => setIsOver(false)}
                            onDrop={onDrop}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                document.getElementById("studentFileInput")?.click();
                              }
                            }}
                            title={t.dndHint || "Press Enter to choose files"}
                          >
                            <div className="student-dnd-content">
                              <div className="student-dnd-text">
                                <strong>{t.dndTitle || "Drag files here"}</strong>
                                <div className="student-dnd-sub">
                                  {t.dndSubtitle || "or click to choose"}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="student-choose-btn"
                                onClick={() => document.getElementById("studentFileInput")?.click()}
                              >
                                {t.chooseFile || "Choose file"}
                              </button>
                              <input
                                id="studentFileInput"
                                className="submission-files"
                                type="file"
                                multiple
                                hidden
                                onChange={(e) => addFiles(e.target.files)}
                              />
                            </div>
                          </div>

                          {submitFiles.length > 0 && (
                            <ul className="student-file-list">
                              {submitFiles.map((f) => (
                                <li
                                  key={`${f.name}_${f.size}`}
                                  className="student-file-item"
                                >
                                  <span className="student-file-name">{f.name}</span>
                                  <button
                                    type="button"
                                    className="student-file-remove"
                                    onClick={() =>
                                      setSubmitFiles((prev) =>
                                        prev.filter((x) => x !== f)
                                      )
                                    }
                                  >
                                    {t.remove || "Remove"}
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}

                          <button
                            type="button"
                            className="submission-btn"
                            disabled={isSubmitting}
                            onClick={() => handleSubmitWork(assignment.id)}
                          >
                            {isSubmitting ? (t.loading || "Loading...") : (t.submitWork || "Submit work")}
                          </button>

                          {submitMessage && (
                            <div className="submission-message">{submitMessage}</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}