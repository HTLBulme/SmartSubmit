import { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./teacher.css";

import { useLang } from "../context/LanguageContext";
import T from "../i18n";

const API_URL = import.meta.env.VITE_API_URL || "";   // verbindung mit backend http://localhost:3000

// Lehrer-Seite / Teacher page /
export default function Teacher() {
  const [lang] = useLang();
  const t = T[lang] || T.en;

  // Formularstatus / Form state /
  const [klass, setKlass] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [due, setDue] = useState(""); // Fälligkeitsdatum / Due date /
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

  // Dateien (Drag & Drop + Dateiauswahl) / Files (drag & drop + file input) /
  const [files, setFiles] = useState([]);      // File[]
  const [isOver, setIsOver] = useState(false); // dnd highlight
  const [msg, setMsg] = useState("");

  // Klassen, Fächer, Aufgaben / Classes, subjects, assignments / 
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [isAssignmentsOpen, setIsAssignmentsOpen] = useState(false);
  const [assignmentsTab, setAssignmentsTab] = useState("active");
  const [archiveBusyId, setArchiveBusyId] = useState(null);
  const [deleteBusyId, setDeleteBusyId] = useState(null);

  const [selectedAssignmentId, setSelectedAssignmentId] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [submissionsMeta, setSubmissionsMeta] = useState(null);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState("");
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false);
  const [gradeDrafts, setGradeDrafts] = useState({});

  // Dateien zur Liste hinzufügen / Add files to list / 
  function addFiles(fileList) {
    // DE: FileList in Array umwandeln und nur einzigartige (Name+Größe) hinzufügen
    // EN: Convert FileList to array and add only unique (name+size)
    const incoming = Array.from(fileList || []);
    setFiles(prev => {
      const map = new Map(prev.map(f => [f.name + "_" + f.size, f]));
      for (const f of incoming) map.set(f.name + "_" + f.size, f);
      return Array.from(map.values());
    });
  }

  // Drag & Drop-Handler / Drag & drop handler /
  function onDrop(e) {
    e.preventDefault();
    setIsOver(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  }

  // Formular absenden / Submit form /
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

      const token = localStorage.getItem("token"); // DE: falls vorhanden / EN: if exists
      await axios.post(`${API_URL}/api/teacher/assignments`, fd, {
        headers: {
          // Let axios/browser set the correct multipart boundary automatically
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      setMsg(t.assgnSaved);
      fetchAssignments();
      setKlass(""); setSubject(""); setTitle(""); setText(""); setDue(""); setDuePreset(""); setLastDuePreset(""); setFiles([]);
    } catch (err) {
      console.error(err);
      setMsg(t.assgnError);
    }
  }
  // Aufgaben vom Server laden / Fetch assignments from server / 
  async function fetchAssignments() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/api/teacher/assignments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAssignments(res.data.data || []);
      } catch (err) {
        console.error("Fehler beim Laden der Aufgaben:", err);
      }
    }

  // Initiales Laden der Daten / Initial data load /
  useEffect(() => {
  async function loadData() {
    try {
      const token = localStorage.getItem("token");

      const [classRes, subjectRes] = await Promise.all([
        axios.get(`${API_URL}/api/classes`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/subjects`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setClasses(classRes.data.data);
      setSubjects(subjectRes.data.data);
    } catch (err) {
      console.error("Fehler beim Laden der Daten:", err);
    }
      fetchAssignments();
  }

  loadData();
}, []);

  // Handler für Abgabenliste / Handler for submissions list /
  function handleAbgabenClick() {
    // kept for backwards compatibility; actual list is handled per assignment
  }
  // Handler für Aufgabenliste / Handler for assignments list /
  function handleAssignmentClick() {
    setAssignmentsTab("active");
    setIsAssignmentsOpen(true);
    fetchAssignments();
  }

  function closeAssignmentsModal() {
    setIsAssignmentsOpen(false);
  }

  async function setArchived(assignmentId, archiviert) {
    try {
      setArchiveBusyId(assignmentId);
      const token = localStorage.getItem("token");
      await axios.patch(
        `${API_URL}/api/teacher/assignments/${assignmentId}/archive`,
        { archiviert },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchAssignments();
    } catch (err) {
      console.error("Fehler beim Archivieren:", err);
      setMsg(t.archiveError || "Error");
    } finally {
      setArchiveBusyId(null);
    }
  }

  async function deleteAssignment(assignmentId) {
    const ok = window.confirm(t.deleteConfirm || "Delete this assignment?");
    if (!ok) return;

    try {
      setDeleteBusyId(assignmentId);
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/teacher/assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (selectedAssignmentId === assignmentId) {
        setIsSubmissionsOpen(false);
        setSelectedAssignmentId(null);
        setSubmissions([]);
        setSubmissionsMeta(null);
      }

      await fetchAssignments();
    } catch (err) {
      console.error("Fehler beim Löschen:", err);
      setMsg(t.deleteError || "Error");
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
        (typeof fileMeta.storedName === "string" && fileMeta.storedName.trim())
          ? fileMeta.storedName
          : (typeof fileMeta.filename === "string" && fileMeta.filename.trim())
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
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${API_URL}/api/teacher/assignments/${assignmentId}/submissions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const list = res.data.data || [];
      setSubmissions(list);
      setSubmissionsMeta(res.data.assignment || null);

      setGradeDrafts((prev) => {
        const next = { ...prev };
        for (const s of list) {
          if (!next[s.id]) {
            next[s.id] = {
              bewertung: typeof s.bewertung === "number" ? String(s.bewertung) : "",
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
      console.error("Fehler beim Laden der Abgaben:", err);
      setSubmissionsError(t.fetchError || "Error loading data");
      setSubmissions([]);
      setSubmissionsMeta(null);
    } finally {
      setSubmissionsLoading(false);
    }
  }

  async function saveGrade(submissionId) {
    const draft = gradeDrafts[submissionId] || {};
    const rawGrade = (draft.bewertung ?? "").trim();
    const rawFeedback = draft.feedback ?? "";

    let bewertung = null;
    if (rawGrade !== "") {
      const parsed = Number.parseInt(rawGrade, 10);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
        setGradeDrafts((prev) => ({
          ...prev,
          [submissionId]: { ...draft, error: t.gradeRange || "Invalid grade (0-100)", ok: "" },
        }));
        return;
      }
      bewertung = parsed;
    }

    const feedback = rawFeedback.trim() === "" ? null : rawFeedback;

    try {
      setGradeDrafts((prev) => ({
        ...prev,
        [submissionId]: { ...draft, saving: true, error: "", ok: "" },
      }));

      const token = localStorage.getItem("token");
      const res = await axios.patch(
        `${API_URL}/api/teacher/submissions/${submissionId}`,
        { bewertung, feedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updated = res.data?.data;
      if (updated) {
        setSubmissions((prev) => prev.map((s) => (s.id === submissionId ? { ...s, ...updated } : s)));
      }

      setGradeDrafts((prev) => ({
        ...prev,
        [submissionId]: { ...prev[submissionId], saving: false, error: "", ok: t.gradeSaved || "Saved" },
      }));
    } catch (err) {
      console.error("Fehler beim Speichern der Bewertung:", err);
      setGradeDrafts((prev) => ({
        ...prev,
        [submissionId]: { ...prev[submissionId], saving: false, error: t.gradeError || "Save failed", ok: "" },
      }));
    }
  }

  function closeSubmissionsModal() {
    setIsSubmissionsOpen(false);
  }

  // Render / Rendering /
  return (
    <div className="teacher-page">

      {isAssignmentsOpen && (
        <>
          <div
            className="modal show"
            role="dialog"
            aria-modal="true"
            style={{ display: "block" }}
          >
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{t.assignmentBtn}</h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={closeAssignmentsModal} />
                </div>
                <div className="modal-body">
                  <div className="d-flex gap-2 mb-3">
                    <button
                      type="button"
                      className={`btn btn-sm ${assignmentsTab === "active" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() => setAssignmentsTab("active")}
                    >
                      {t.activeTab || "Active"}
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${assignmentsTab === "archived" ? "btn-primary" : "btn-outline-primary"}`}
                      onClick={() => setAssignmentsTab("archived")}
                    >
                      {t.archiveTab || "Archive"}
                    </button>
                  </div>

                  {assignments.length === 0 ? (
                    <div className="text-muted">{t.noAssignments}</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered align-middle" style={{ minWidth: '1000px' }}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>{t.titleLbl}</th>
                            <th>{t.classLbl}</th>
                            <th>{t.subjectLbl}</th>
                            <th>{t.dueLbl}</th>
                            <th>{t.status}</th>
                            <th>{t.abgabenBtn}</th>
                            <th>Count</th>
                            <th>{t.archiveTab || "Archive"}</th>
                            <th>{t.deleteLbl || "Delete"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignments
                            .filter((a) => (assignmentsTab === "archived" ? a.archiviert : !a.archiviert))
                            .map((a, idx) => (
                              <tr key={a.id}>
                                <td>{idx + 1}</td>
                                <td>{a.titel}</td>
                                <td>{a.klasse}</td>
                                <td>{a.fach}</td>
                                <td>{a.termin ? new Date(a.termin).toLocaleDateString() : ''}</td>
                                <td>
                                  {a.status === 'active' ? (
                                    <span className="badge bg-success">{t.active || "Active"}</span>
                                  ) : a.status === 'expired' ? (
                                    <span className="badge bg-danger">{t.overdue || "Expired"}</span>
                                  ) : (
                                    <span className="badge bg-secondary">{t.archiveTab || "Archived"}</span>
                                  )}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="btn btn-sm btn-outline-primary"
                                    onClick={async () => {
                                      setSelectedAssignmentId(a.id);
                                      setIsSubmissionsOpen(true);
                                      await fetchSubmissions(a.id);
                                    }}
                                  >
                                    {t.abgabenBtn}
                                  </button>
                                </td>
                                <td>{a.abgabenCount}</td>
                                <td>
                                  {a.archiviert ? (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary"
                                      disabled={archiveBusyId === a.id}
                                      onClick={() => setArchived(a.id, false)}
                                    >
                                      {archiveBusyId === a.id ? (t.saving || "Saving...") : (t.restore || "Restore")}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-secondary"
                                      disabled={archiveBusyId === a.id}
                                      onClick={() => setArchived(a.id, true)}
                                    >
                                      {archiveBusyId === a.id ? (t.saving || "Saving...") : (t.archive || "Archive")}
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
                                    {deleteBusyId === a.id ? (t.saving || "Saving...") : (t.deleteLbl || "Delete")}
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
          <div
            className="modal show"
            role="dialog"
            aria-modal="true"
            style={{ display: "block" }}
          >
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    {t.submissionsTitle || t.abgabenBtn}
                    {submissionsMeta?.titel ? `: ${submissionsMeta.titel}` : ""}
                  </h5>
                  <button type="button" className="btn-close" aria-label="Close" onClick={closeSubmissionsModal} />
                </div>
                <div className="modal-body">
                  {submissionsLoading && (
                    <div className="text-muted">{t.loading || "Loading..."}</div>
                  )}

                  {submissionsError && (
                    <div className="text-danger">{submissionsError}</div>
                  )}

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
                            <th>{t.feedback || "Feedback"}</th>
                            <th>{t.save || "Save"}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {submissions.map((s) => (
                            (() => {
                              const draft = gradeDrafts[s.id] || { bewertung: "", feedback: "", saving: false, error: "", ok: "" };
                              return (
                            <tr key={s.id}>
                              <td>
                                {s.schueler?.vorname} {s.schueler?.nachname}
                                {s.schueler?.email ? (
                                  <div className="text-muted" style={{ fontSize: "0.85rem" }}>
                                    {s.schueler.email}
                                  </div>
                                ) : null}
                              </td>
                              <td>{s.abgabe_zeitpunkt ? new Date(s.abgabe_zeitpunkt).toLocaleString() : ""}</td>
                              <td style={{ minWidth: "110px" }}>
                                <input
                                  className="form-control form-control-sm"
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={draft.bewertung}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setGradeDrafts((prev) => ({
                                      ...prev,
                                      [s.id]: { ...draft, bewertung: v, error: "", ok: "" },
                                    }));
                                  }}
                                  placeholder={typeof s.bewertung === "number" ? String(s.bewertung) : "0-100"}
                                />
                              </td>
                              <td>
                                {Array.isArray(s.dateien) && s.dateien.length > 0 ? (
                                  <ul className="mb-0" style={{ paddingLeft: "1.1rem" }}>
                                    {s.dateien.map((f, idx) => {
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
                                  <div className="text-danger" style={{ fontSize: "0.85rem" }}>{draft.error}</div>
                                ) : null}
                                {draft.ok ? (
                                  <div className="text-success" style={{ fontSize: "0.85rem" }}>{draft.ok}</div>
                                ) : null}
                              </td>
                              <td style={{ width: "1%", whiteSpace: "nowrap" }}>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-primary"
                                  disabled={draft.saving}
                                  onClick={() => saveGrade(s.id)}
                                >
                                  {draft.saving ? (t.saving || "Saving...") : (t.save || "Save")}
                                </button>
                              </td>
                            </tr>
                              );
                            })()
                          ))}
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

      <div className="container py-3">

        <div className="card shadow-lg border-0 rounded-4 p-3 mx-auto teacher-card">
          <div className="card-body">
          <h2 className="text-center mb-3 fw-bold">
            {t.teacherPanel}
          </h2>

          <form onSubmit={onSubmit} className="teacher-form-compact">
            {/* Row: Class */}
            <div className="row g-2 align-items-center mb-2">
              <label className="col-12 col-sm-2 col-form-label fw-semibold">{t.classLbl}</label>
              <div className="col-12 col-sm-10">
                <select className="form-select" value={klass} onChange={(e)=>setKlass(e.target.value)} required>
                  <option value="">{t.selectPlaceholder}</option>
                  {Array.isArray(classes) && Array.from(new Map(classes.map(c => [c.name, c])).values()).map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row: Subject */}
            <div className="row g-2 align-items-center mb-2">
              <label className="col-12 col-sm-2 col-form-label fw-semibold">{t.subjectLbl}</label>
              <div className="col-12 col-sm-10">
                <select className="form-select" value={subject} onChange={(e)=>setSubject(e.target.value)} required>
                  <option value="">{t.selectPlaceholder}</option>
                  {Array.isArray(subjects) && Array.from(new Map(subjects.map(s => [s.name, s])).values()).map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row: Title */}
            <div className="row g-2 align-items-center mb-2">
              <label className="col-12 col-sm-2 col-form-label fw-semibold">{t.titleLbl}</label>
              <div className="col-12 col-sm-10">
                <input
                  className="form-control"
                  type="text"
                  placeholder={t.titlePh}
                  value={title}
                  onChange={(e)=>setTitle(e.target.value)}
                />
              </div>
            </div>

            {/* Row: Due (preset + calendar) */}
            <div className="row g-2 align-items-center mb-2">
              <label className="col-12 col-sm-2 col-form-label fw-semibold">{t.dueLbl}</label>
              <div className="col-12 col-sm-10">
                <div className="d-flex flex-nowrap gap-2 align-items-center">
                  <select
                    className="form-select"
                    style={{ maxWidth: 220, flex: "0 0 220px" }}
                    value={duePreset}
                    onChange={(e) => {
                      const v = e.target.value;
                      applyDuePreset(v);
                      setLastDuePreset(v);
                      // Reset so the same preset can be picked again and still update the date
                      setDuePreset("");
                    }}
                  >
                    <option value="">
                      {lastDuePreset === "day" ? (t.duePresetDay || "+1 day")
                        : lastDuePreset === "week" ? (t.duePresetWeek || "+1 week")
                        : lastDuePreset === "month" ? (t.duePresetMonth || "+1 month")
                        : (t.duePresetPlaceholder || "Quick select")}
                    </option>
                    <option value="day">{t.duePresetDay || "+1 day"}</option>
                    <option value="week">{t.duePresetWeek || "+1 week"}</option>
                    <option value="month">{t.duePresetMonth || "+1 month"}</option>
                  </select>

                  <input
                    className="form-control"
                    type="date"
                    value={due}
                    onChange={(e)=>{ setDue(e.target.value); setLastDuePreset(""); }}
                    required
                    style={{ minWidth: 220, flex: "1 1 auto" }}
                  />
                </div>
              </div>
            </div>

            {/* Row: Link */}
            <div className="row g-2 align-items-center mb-2">
              <label className="col-12 col-sm-2 col-form-label fw-semibold">{t.linkLbl}</label>
              <div className="col-12 col-sm-10">
                <input
                  className="form-control"
                  type="url"
                  placeholder={t.linkPh}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
              </div>
            </div>

            {/* Row: Text */}
            <div className="row g-2 align-items-start mb-2">
              <label className="col-12 col-sm-2 col-form-label fw-semibold">{t.textLbl}</label>
              <div className="col-12 col-sm-10">
                <textarea
                  className="form-control"
                  rows="3"
                  placeholder={t.textPh}
                  value={text}
                  onChange={(e)=>setText(e.target.value)}
                />
              </div>
            </div>

            {/* Row: Files */}
            <div className="row g-2 align-items-start mb-2">
              <label className="col-12 col-sm-2 col-form-label fw-semibold">{t.filesLbl}</label>
              <div className="col-12 col-sm-10">

              <div
                className={`dnd-zone ${isOver ? "over" : ""}`}
                onDragOver={(e)=>{ e.preventDefault(); setIsOver(true); }}
                onDragLeave={()=>setIsOver(false)}
                onDrop={onDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(e)=>{ if (e.key === "Enter") document.getElementById("fileInput").click(); }}
                title={t.dndHint}
              >
                <div className="dnd-content">
                  <div className="dnd-icon">📂</div>
                  <div className="dnd-text">
                    <strong>{t.dndTitle}</strong><br/>
                    <span className="text-muted">{t.dndSubtitle}</span>
                  </div>
                  <button type="button" className="btn btn-outline-primary btn-sm"
                          onClick={()=>document.getElementById("fileInput").click()}>
                    {t.chooseFile}
                  </button>
                  <input id="fileInput" type="file" multiple hidden onChange={(e)=>addFiles(e.target.files)} />
                </div>
              </div>

              {/* Preview list */}
              {files.length > 0 && (
                <ul className="list-group mt-2" style={{ maxHeight: '160px', overflowY: 'auto' }}>
                  {files.map((f) => (
                    <li key={f.name + "_" + f.size} className="list-group-item d-flex justify-content-between align-items-center">
                      <span className="text-truncate" style={{maxWidth:"80%"}}>
                        {f.name} <span className="text-muted">({Math.round(f.size/1024)} KB)</span>
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm btn-link text-danger"
                        onClick={()=>setFiles(prev => prev.filter(x => x !== f))}
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
                <button type="submit" className="btn btn-primary py-2 fw-semibold w-100">
                  {t.saveAssgn}
                </button>
              </div>
            </div>
          </form>
          {/* Statusmeldung / Status message  */}  

          {msg && <div className="alert alert-info text-center mt-3">{msg}</div>}
          {/* 'Aufgabenliste' */}
          <div className="d-flex justify-content-center gap-3 mt-3">
            <button type="button" className="btn btn-outline-secondary" onClick={handleAssignmentClick}>
              {t.assignmentBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
} 