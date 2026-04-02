import { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./teacher.css";

import { useLang } from "../context/LanguageContext";
import T from "../i18n";

import TeacherSidebar from "./TeacherSidebar";
import TeacherSettingsView from "./TeacherSettingsView";

// --- backend http://localhost:3000 ---
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

  const firstName =
    userData?.firstName ||
    storedUser?.firstName ||
    userData?.vorname ||
    storedUser?.vorname ||
    "";
  const lastName =
    userData?.lastName ||
    storedUser?.lastName ||
    userData?.nachname ||
    storedUser?.nachname ||
    "";
  const email = userData?.email || storedUser?.email || "";

  const fullName = [firstName, lastName].filter(Boolean).join(" ");
  if (fullName.trim()) return titleCaseWords(fullName);

  if (userData?.name) return titleCaseWords(userData.name);
  if (storedUser?.name) return titleCaseWords(storedUser.name);

  if (typeof email === "string" && email.includes("@")) {
    return titleCaseWords(email.split("@")[0].replace(/[._-]+/g, " "));
  }

  return "Lehrer";
}

// --- Teacher page ---
export default function Teacher() {
  const [lang] = useLang();
  const t = T[lang] || T.en;

  const [activeView, setActiveView] = useState("dashboard");
  const [userData, setUserData] = useState(null);

  // --- Assignment form state ---
  const [klass, setKlass] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [duePreset, setDuePreset] = useState("");
  const [lastDuePreset, setLastDuePreset] = useState("");
  const [link, setLink] = useState("");

  function formatDateForInput(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function applyDuePreset(preset) {
    if (!preset) return;

    const next = new Date();
    if (preset === "day") next.setDate(next.getDate() + 1);
    if (preset === "week") next.setDate(next.getDate() + 7);
    if (preset === "month") next.setMonth(next.getMonth() + 1);

    setDue(formatDateForInput(next));
  }

  // --- Files and assignments state ---
  const [files, setFiles] = useState([]);
  const [isOver, setIsOver] = useState(false);
  const [msg, setMsg] = useState("");

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [isAssignmentsOpen, setIsAssignmentsOpen] = useState(false);
  const [assignmentsTab, setAssignmentsTab] = useState("active");
  const [archiveBusyId, setArchiveBusyId] = useState(null);
  const [deleteBusyId, setDeleteBusyId] = useState(null);

  // --- Submissions and grading state ---
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsMeta, setSubmissionsMeta] = useState(null);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState("");
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);
  const [gradeDrafts, setGradeDrafts] = useState({});
  const [restoreAssignmentsOnClose, setRestoreAssignmentsOnClose] = useState(false);

  // --- Add files to state (unique by name+size) ---
  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name + "_" + f.size, f]));
      for (const f of incoming) map.set(f.name + "_" + f.size, f);
      return Array.from(map.values());
    });
  }

  // --- Handle drag & drop ---
  function onDrop(e) {
    e.preventDefault();
    setIsOver(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  }

  // --- Handle assignment form submit ---
  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    try {
      const fd = new FormData();
      fd.append("class", klass);
      fd.append("subject", subject);
      fd.append("title", title);
      fd.append("text", text);
      fd.append("link", link);
      fd.append("dueDate", due);
      files.forEach((f) => fd.append("files", f));

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      await axios.post(`${API_URL}/api/teacher/assignments`, fd, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      setMsg("assgnSaved");
      fetchAssignments();
      setKlass("");
      setSubject("");
      setTitle("");
      setText("");
      setDue("");
      setDuePreset("");
      setLastDuePreset("");
      setLink("");
      setFiles([]);
    } catch (err) {
      console.error(err);
      setMsg("assgnError");
    }
  }

  // --- Fetch assignments from server ---
  async function fetchAssignments() {
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/teacher/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments(res.data.data || []);
    } catch (err) {
      console.error("Error loading assignments:", err);
    }
  }

  // --- Initial data load ---
  useEffect(() => {
    async function loadData() {
      const rawUser = localStorage.getItem("user");
      if (rawUser) {
        try {
          setUserData(JSON.parse(rawUser));
        } catch (e) {
          console.error("Error parsing user data:", e);
        }
      }
      try {
        const token = sessionStorage.getItem("token") || localStorage.getItem("token");

        const [classRes, subjectRes] = await Promise.all([
          axios.get(`${API_URL}/api/classes`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API_URL}/api/subjects`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        setClasses(classRes.data.data);
        setSubjects(subjectRes.data.data);
      } catch (err) {
        console.error("Error loading data:", err);
      }
      fetchAssignments();
    }

    loadData();
  }, []);

  // Block main page scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAssignmentsOpen, isSubmissionsOpen]);

  function handleSubmissionsClick() {
    // kept for backwards compatibility; actual list is handled per assignment
  }

  function handleAssignmentClick() {
    setAssignmentsTab("active");
    setIsAssignmentsOpen(true);
    fetchAssignments();
  }

  function closeAssignmentsModal() {
    setIsAssignmentsOpen(false);
  }

  async function openSubmissionsModal(assignmentId) {
    const shouldRestore = isAssignmentsOpen;
    setRestoreAssignmentsOnClose(shouldRestore);
    if (shouldRestore) setIsAssignmentsOpen(false);

    setSelectedAssignmentId(assignmentId);
    setIsSubmissionsOpen(true);
    await fetchSubmissions(assignmentId);
  }

  async function setArchived(assignmentId, archived) {
    try {
      setArchiveBusyId(assignmentId);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/api/teacher/assignments/${assignmentId}/archive`,
        { archived },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchAssignments();
    } catch (err) {
      console.error("Error archiving assignment:", err);
      setMsg(t.archiveError || t.errorArchiving || "Error archiving");
    } finally {
      setArchiveBusyId(null);
    }
  }

  async function deleteAssignment(assignmentId) {
    const ok = window.confirm(t.deleteConfirm || "Delete this assignment?");
    if (!ok) return;

    try {
      setDeleteBusyId(assignmentId);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/teacher/assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (selectedAssignmentId === assignmentId) {
        setIsSubmissionsOpen(false);
        setSelectedAssignmentId(null);
        setSubmissions([]);
        setSubmissionsMeta(null);
      }

      await fetchAssignments();
    } catch (err) {
      console.error("Error deleting assignment:", err);
      setMsg(t.deleteError || t.errorDeleting || "Error deleting");
    } finally {
      setDeleteBusyId(null);
    }
  }

  const getSubmissionFileUrl = (fileMeta) => {
    if (!fileMeta) return null;
    if (typeof fileMeta === "string") {
      if (fileMeta.startsWith("/uploads/")) return `${API_URL}${fileMeta}`;
      return null;
    }

    if (typeof fileMeta === "object") {
      if (typeof fileMeta.url === "string" && fileMeta.url.startsWith("/")) {
        return `${API_URL}${fileMeta.url}`;
      }

      const stored =
        typeof fileMeta.storedName === "string" && fileMeta.storedName.trim()
          ? fileMeta.storedName
          : typeof fileMeta.filename === "string" && fileMeta.filename.trim()
          ? fileMeta.filename
          : null;

      if (stored) return `${API_URL}/uploads/submissions/${stored}`;

      if (typeof fileMeta.path === "string") {
        const normalized = fileMeta.path.replace(/\\/g, "/");
        const idx = normalized.lastIndexOf("/uploads/");
        if (idx !== -1) return `${API_URL}${normalized.slice(idx)}`;
      }
    }
    return null;
  };

  const getSubmissionFileLabel = (fileMeta) => {
    if (!fileMeta) return "";
    if (typeof fileMeta === "string") return fileMeta.split("/").pop() || fileMeta;
    if (typeof fileMeta === "object") {
      return fileMeta.originalName || fileMeta.filename || fileMeta.storedName || "File";
    }
    return "";
  };

  async function fetchSubmissions(assignmentId) {
    try {
      setSubmissionsError("");
      setSubmissionsLoading(true);
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/teacher/assignments/${assignmentId}/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const list = res.data.data || [];
      setSubmissions(list);
      setSubmissionsMeta(res.data.assignment || null);

      setGradeDrafts((prev) => {
        const next = { ...prev };
        for (const s of list) {
          if (!next[s.id]) {
            next[s.id] = {
              grade: typeof s.grade === "number" ? String(s.grade) : "",
              feedback: typeof s.feedback === "string" ? s.feedback : "",
              saving: false,
              error: "",
              ok: "",
            };
          }
        }
        return next;
      });
    } catch (err) {
      console.error("Error loading submissions:", err);
      setSubmissionsError(t.fetchError || t.errorLoadingSubmissions || "Error loading submissions");
      setSubmissions([]);
      setSubmissionsMeta(null);
    } finally {
      setSubmissionsLoading(false);
    }
  }

  async function saveGrade(submissionId) {
    const draft = gradeDrafts[submissionId] || {};
    const rawGrade = (draft.grade ?? "").trim();
    const rawFeedback = draft.feedback ?? "";

    let grade = null;
    if (rawGrade !== "") {
      const parsed = Number.parseInt(rawGrade, 10);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
        setGradeDrafts((prev) => ({
          ...prev,
          [submissionId]: {
            ...draft,
            error: t.gradeRange || "Invalid grade (0-100)",
            ok: "",
          },
        }));
        return;
      }
      grade = parsed;
    }

    const feedback = rawFeedback.trim() === "" ? null : rawFeedback;

    try {
      setGradeDrafts((prev) => ({
        ...prev,
        [submissionId]: { ...draft, saving: true, error: "", ok: "" },
      }));

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.patch(
        `${API_URL}/api/teacher/submissions/${submissionId}`,
        { grade, feedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updated = res.data?.data;
      if (updated) {
        setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? { ...s, ...updated } : s)));
      }

      setGradeDrafts((prev) => ({
        ...prev,
        [submissionId]: {
          ...prev[submissionId],
          saving: false,
          error: "",
          ok: t.gradeSaved || "Saved",
        },
      }));
    } catch (err) {
      console.error("Error saving grade:", err);
      setGradeDrafts((prev) => ({
        ...prev,
        [submissionId]: {
          ...prev[submissionId],
          saving: false,
          error: t.gradeError || t.errorSavingGrade || "Save failed",
          ok: "",
        },
      }));
    }
  }

  function closeSubmissionsModal() {
    setIsSubmissionsOpen(false);

    if (restoreAssignmentsOnClose) {
      setRestoreAssignmentsOnClose(false);
      setIsAssignmentsOpen(true);
    }
  }

  return (
    <div className="teacher-layout">
      <TeacherSidebar userData={userData} activeView={activeView} onViewChange={setActiveView} />

      <div className="teacher-main-content">
        <div className="teacher-page">
          {isAssignmentsOpen && (
            <>
              <div className="modal show" role="dialog" aria-modal="true" style={{ display: "block" }}>
                <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ maxWidth: "95vw" }}>
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title">{t.assignmentBtn}</h5>
                      <button
                        type="button"
                        className="btn-close"
                        aria-label="Close"
                        onClick={closeAssignmentsModal}
                      />
                    </div>

                    <div className="modal-body">
                      <div className="d-flex gap-2 mb-3">
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            assignmentsTab === "active" ? "btn-primary" : "btn-outline-primary"
                          }`}
                          onClick={() => setAssignmentsTab("active")}
                        >
                          {t.activeTab || "Active"}
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${
                            assignmentsTab === "archived" ? "btn-primary" : "btn-outline-primary"
                          }`}
                          onClick={() => setAssignmentsTab("archived")}
                        >
                          {t.archiveTab || "Archive"}
                        </button>
                      </div>

                      {assignments.length === 0 ? (
                        <div className="text-muted">{t.noAssignments}</div>
                      ) : (
                        <div className="table-responsive">
                          <table className="table table-bordered align-middle" style={{ minWidth: "1000px" }}>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>{t.titleLbl}</th>
                                <th>{t.classLbl}</th>
                                <th>{t.subjectLbl}</th>
                                <th>{t.dueLbl}</th>
                                <th>{t.status}</th>
                                <th>{t.submissionsBtn}</th>
                                <th>Count</th>
                                <th>{t.archiveTab || "Archive"}</th>
                                <th>{t.deleteLbl || "Delete"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {assignments
                                .filter((a) => (assignmentsTab === "archived" ? a.archived : !a.archived))
                                .map((a, idx) => (
                                  <tr key={a.id}>
                                    <td>{idx + 1}</td>
                                    <td>{a.title}</td>
                                    <td>{a.class}</td>
                                    <td>{a.subject}</td>
                                    <td>{a.dueDate ? new Date(a.dueDate).toLocaleDateString() : ""}</td>
                                    <td>
                                      {a.status === "active" ? (
                                        <span className="badge bg-success">{t.active || "Active"}</span>
                                      ) : a.status === "expired" ? (
                                        <span className="badge bg-danger">{t.overdue || "Expired"}</span>
                                      ) : (
                                        <span className="badge bg-secondary">{t.archiveTab || "Archived"}</span>
                                      )}
                                    </td>
                                    <td>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-primary"
                                        onClick={() => openSubmissionsModal(a.id)}
                                      >
                                        {t.submissionsBtn}
                                      </button>
                                    </td>
                                    <td>{a.submissionsCount}</td>
                                    <td>
                                      {a.archived ? (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-secondary"
                                          disabled={archiveBusyId === a.id}
                                          onClick={() => setArchived(a.id, false)}
                                        >
                                          {archiveBusyId === a.id
                                            ? t.saving || "Saving..."
                                            : t.restore || "Restore"}
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          className="btn btn-sm btn-outline-secondary"
                                          disabled={archiveBusyId === a.id}
                                          onClick={() => setArchived(a.id, true)}
                                        >
                                          {archiveBusyId === a.id
                                            ? t.saving || "Saving..."
                                            : t.archive || "Archive"}
                                        </button>
                                      )}
                                    </td>
                                    <td>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-outline-danger"
                                        disabled={deleteBusyId === a.id}
                                        onClick={() => deleteAssignment(a.id)}
                                      >
                                        {deleteBusyId === a.id
                                          ? t.saving || "Saving..."
                                          : t.deleteLbl || "Delete"}
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={closeAssignmentsModal}>
                        {t.close || "Close"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-backdrop show" onClick={closeAssignmentsModal} />
            </>
          )}

          {isSubmissionsOpen && (
            <>
              <div className="modal show" role="dialog" aria-modal="true" style={{ display: "block" }}>
                <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ maxWidth: "95vw" }}>
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title">
                        {t.submissionsTitle}
                        {submissionsMeta?.title ? `: ${submissionsMeta.title}` : ""}
                      </h5>
                      <button
                        type="button"
                        className="btn-close"
                        aria-label="Close"
                        onClick={closeSubmissionsModal}
                      />
                    </div>

                    <div className="modal-body">
                      {submissionsLoading && <div className="text-muted">{t.loading || "Loading..."}</div>}

                      {submissionsError && <div className="text-danger">{submissionsError}</div>}

                      {!submissionsLoading && !submissionsError && submissions.length === 0 && (
                        <div className="text-muted">{t.noSubmissions || "No submissions"}</div>
                      )}

                      {!submissionsLoading && !submissionsError && submissions.length > 0 && (
                        <div className="table-responsive">
                          <table className="table table-sm table-bordered align-middle">
                            <thead>
                              <tr>
                                <th>Student</th>
                                <th>Time</th>
                                <th>{t.grade || "Grade"}</th>
                                <th>{t.filesLbl || "Files"}</th>
                                <th>{t.textLbl || "Text"}</th>
                                <th>{t.feedback || "Feedback"}</th>
                                <th>{t.save || "Save"}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {submissions.map((s) => {
                                const draft = gradeDrafts[s.id] || {
                                  grade: "",
                                  feedback: "",
                                  saving: false,
                                  error: "",
                                  ok: "",
                                };

                                return (
                                  <tr key={s.id}>
                                    <td>
                                      {s.student?.firstName} {s.student?.lastName}
                                      {s.student?.email ? (
                                        <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                                          {s.student.email}
                                        </div>
                                      ) : null}
                                    </td>

                                    <td>{s.submittedAt ? new Date(s.submittedAt).toLocaleString() : ""}</td>

                                    <td style={{ minWidth: "110px" }}>
                                      <input
                                        className="form-control form-control-sm"
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={draft.grade}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setGradeDrafts((prev) => ({
                                            ...prev,
                                            [s.id]: { ...draft, grade: v, error: "", ok: "" },
                                          }));
                                        }}
                                        placeholder={
                                          typeof s.grade === "number" ? String(s.grade) : "0-100"
                                        }
                                      />
                                    </td>

                                    <td>
                                      {Array.isArray(s.files) && s.files.length > 0 ? (
                                        <ul className="mb-0" style={{ paddingLeft: "1.1rem" }}>
                                          {s.files.map((f, idx) => {
                                            const href = getSubmissionFileUrl(f);
                                            const label = getSubmissionFileLabel(f);
                                            return (
                                              <li key={`${s.id}-f-${idx}`}>
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
                                      ) : (
                                        "—"
                                      )}
                                    </td>

                                    <td style={{ minWidth: "220px" }}>
                                      {s.text && s.text.trim() !== "" ? s.text : "—"}
                                    </td>

                                    <td style={{ minWidth: "220px" }}>
                                      <textarea
                                        className="form-control form-control-sm"
                                        rows={2}
                                        value={draft.feedback}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setGradeDrafts((prev) => ({
                                            ...prev,
                                            [s.id]: { ...draft, feedback: v, error: "", ok: "" },
                                          }));
                                        }}
                                        placeholder={s.feedback || ""}
                                      />
                                      {draft.error ? (
                                        <div className="text-danger" style={{ fontSize: "0.85rem" }}>
                                          {draft.error}
                                        </div>
                                      ) : null}
                                      {draft.ok ? (
                                        <div className="text-success" style={{ fontSize: "0.85rem" }}>
                                          {draft.ok}
                                        </div>
                                      ) : null}
                                    </td>

                                    <td style={{ width: "1%", whiteSpace: "nowrap" }}>
                                      <button
                                        type="button"
                                        className="btn btn-sm btn-primary"
                                        disabled={draft.saving}
                                        onClick={() => saveGrade(s.id)}
                                      >
                                        {draft.saving ? t.saving || "Saving..." : t.save || "Save"}
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={closeSubmissionsModal}>
                        {t.close || "Close"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-backdrop show" onClick={closeSubmissionsModal} />
            </>
          )}

          {activeView === "dashboard" && (
            <div className="teacher-dashboard">
              <header
                className="d-flex justify-content-between align-items-center mb-4 pb-3"
                style={{ borderBottom: "1px solid #e5e7eb" }}
              >
                <h1 className="m-0 fw-bold" style={{ fontSize: "1.75rem", color: "#1f2937" }}>
                  {(t.welcome || "Willkommen").trim()} {getFriendlyName(userData)}
                </h1>
              </header>

              <h2 className="fs-5 fw-bold mb-3 px-1" style={{ color: "#1f2937" }}>
                {t.teacherPanel}
              </h2>

              <div className="card shadow-sm border-0 rounded-4 p-3 mx-auto teacher-card" style={{ maxWidth: "100%" }}>
                <div className="card-body p-1">
                  <form onSubmit={onSubmit} className="teacher-form-compact">
                    <div className="teacher-field-row">
                      <label className="teacher-label" htmlFor="teacher-class">
                        {t.classLbl}
                      </label>
                      <div className="teacher-field-control">
                        <select
                          id="teacher-class"
                          className="form-select"
                          value={klass}
                          onChange={(e) => setKlass(e.target.value)}
                          required
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          {Array.isArray(classes) &&
                            Array.from(new Map(classes.map((c) => [c.name, c])).values()).map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="teacher-field-row">
                      <label className="teacher-label" htmlFor="teacher-subject">
                        {t.subjectLbl}
                      </label>
                      <div className="teacher-field-control">
                        <select
                          id="teacher-subject"
                          className="form-select"
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          required
                        >
                          <option value="">{t.selectPlaceholder}</option>
                          {Array.isArray(subjects) &&
                            Array.from(new Map(subjects.map((s) => [s.name, s])).values()).map((s) => (
                              <option key={s.id} value={s.name}>
                                {s.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="teacher-field-row">
                      <label className="teacher-label" htmlFor="teacher-title">
                        {t.titleLbl}
                      </label>
                      <div className="teacher-field-control">
                        <input
                          id="teacher-title"
                          className="form-control"
                          type="text"
                          placeholder={t.titlePh}
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="teacher-field-row">
                      <label className="teacher-label" htmlFor="teacher-due-date">
                        {t.dueLbl}
                      </label>
                      <div className="teacher-field-control">
                        <div className="teacher-due-controls">
                          <select
                            className="form-select"
                            value={duePreset}
                            onChange={(e) => {
                              const v = e.target.value;
                              applyDuePreset(v);
                              setLastDuePreset(v);
                              setDuePreset("");
                            }}
                          >
                            <option value="">
                              {lastDuePreset === "day"
                                ? t.duePresetDay || "+1 day"
                                : lastDuePreset === "week"
                                ? t.duePresetWeek || "+1 week"
                                : lastDuePreset === "month"
                                ? t.duePresetMonth || "+1 month"
                                : t.duePresetPlaceholder || "Quick select"}
                            </option>
                            <option value="day">{t.duePresetDay || "+1 day"}</option>
                            <option value="week">{t.duePresetWeek || "+1 week"}</option>
                            <option value="month">{t.duePresetMonth || "+1 month"}</option>
                          </select>

                          <input
                            id="teacher-due-date"
                            className="form-control"
                            type="date"
                            value={due}
                            onChange={(e) => {
                              setDue(e.target.value);
                              setLastDuePreset("");
                            }}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="teacher-field-row">
                      <label className="teacher-label" htmlFor="teacher-link">
                        {t.linkLbl}
                      </label>
                      <div className="teacher-field-control">
                        <input
                          id="teacher-link"
                          className="form-control"
                          type="url"
                          placeholder={t.linkPh}
                          value={link}
                          onChange={(e) => setLink(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="teacher-field-row align-start">
                      <label className="teacher-label with-top-padding" htmlFor="teacher-text">
                        {t.textLbl}
                      </label>
                      <div className="teacher-field-control">
                        <textarea
                          id="teacher-text"
                          className="form-control"
                          rows="3"
                          placeholder={t.textPh}
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="teacher-field-row align-start">
                      <label className="teacher-label with-top-padding" htmlFor="fileInput">
                        {t.filesLbl}
                      </label>
                      <div className="teacher-field-control">
                        <div
                          className={`dnd-zone ${isOver ? "over" : ""}`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsOver(true);
                          }}
                          onDragLeave={() => setIsOver(false)}
                          onDrop={onDrop}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") document.getElementById("fileInput").click();
                          }}
                          title={t.dndHint}
                        >
                          <div className="dnd-content">
                            <div className="dnd-icon">📂</div>
                            <div className="dnd-text">
                              <strong>{t.dndTitle}</strong>
                              <br />
                              <span className="text-muted">{t.dndSubtitle}</span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => document.getElementById("fileInput").click()}
                            >
                              {t.chooseFile}
                            </button>
                            <input
                              id="fileInput"
                              type="file"
                              multiple
                              hidden
                              onChange={(e) => addFiles(e.target.files)}
                            />
                          </div>
                        </div>

                        {files.length > 0 && (
                          <ul className="list-group mt-2" style={{ maxHeight: "160px", overflowY: "auto" }}>
                            {files.map((f) => (
                              <li
                                key={f.name + "_" + f.size}
                                className="list-group-item d-flex justify-content-between align-items-center"
                              >
                                <span className="teacher-file-name">
                                  {f.name}{" "}
                                  <span className="text-muted">({Math.round(f.size / 1024)} KB)</span>
                                </span>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-link text-danger"
                                  onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}
                                >
                                  {t.remove}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-12">
                        <button
                          type="submit"
                          className="btn btn-primary py-2 fw-semibold w-100"
                          style={{
                            backgroundColor: "#1d77e8",
                            borderColor: "#1d77e8",
                            color: "#fff",
                          }}
                        >
                          {t.saveAssgn}
                        </button>
                      </div>
                    </div>
                  </form>

                  {msg && (
                    <div
                      className="text-center mt-3"
                      style={{
                        backgroundColor:
                          msg.toLowerCase().includes("error") || msg.toLowerCase().includes("fehl")
                            ? "#fee2e2"
                            : "#d1fae5",
                        color:
                          msg.toLowerCase().includes("error") || msg.toLowerCase().includes("fehl")
                            ? "#991b1b"
                            : "#065f46",
                        padding: "0.75rem",
                        borderRadius: "8px",
                        fontWeight: "500",
                        border: "none",
                      }}
                    >
                      {t[msg] || msg}
                    </div>
                  )}

                  <div className="teacher-actions d-flex justify-content-center gap-3 mt-3">
                    <button
                      type="button"
                      className="btn btn-outline-primary px-4 py-2"
                      onClick={handleAssignmentClick}
                    >
                      {t.assignmentBtn}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === "settings" && (
            <div className="container py-3">
              <TeacherSettingsView userData={userData} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}