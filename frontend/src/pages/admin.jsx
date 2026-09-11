import { useLang } from "../context/LanguageContext";
import React from "react";
import T from "../i18n";
import { useCallback, useState, useEffect } from "react"; // NEW: added useEffect
import axios from "axios";
import * as XLSX from "xlsx";
import AdminUserModal from "../components/AdminUserModal";
import { formatSchoolYear } from "../utils/schoolYear";
import "./admin.css";

const API_URL = import.meta.env.VITE_API_URL || "";

const IMPORT_COLUMNS = Object.freeze({
  students: ["vorname", "nachname", "email", "klasse", "jahrgang"],
  teachers: ["vorname", "nachname", "email", "klasse", "jahrgang", "fach_kuerzel"],
});

function formatImportMessage(template, values) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replace(`{${key}}`, String(value)),
    template,
  );
}

function getPreviewHeaderLabel(key, t) {
  const map = {
    vorname: t.firstName,
    nachname: t.lastName,
    email: t.email,
    klasse: t.classLbl,
    className: t.classLbl,
    jahrgang: t.gradeLevel,
    fach_kuerzel: t.subjectCode,
    subjectCode: t.subjectAbbrev,
  };
  return map[key] || key;
}

// NEW: helper to build auth header from session/local storage
function getAuthHeader() {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

export default function UploadUsers() {
  const [lang] = useLang();
  const t = T[lang] || T.en;

  // NEW: active tab — "import" | "students" | "teachers"
  const [tab, setTab] = useState("import");

  // --- original state (unchanged) ---
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [role, setRole] = useState("students");

  // NEW: state for students tab
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);

  // NEW: state for teachers tab
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [editor, setEditor] = useState(null);
  const [editorBusy, setEditorBusy] = useState(false);
  const [editorError, setEditorError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  // NEW: load class list and subject list once on mount
  useEffect(() => {
    axios
      .get(`${API_URL}/api/admin/classes`, { headers: getAuthHeader() })
      .then((res) => { if (res.data.success) setClasses(res.data.data); })
      .catch(() => {});
    axios
      .get(`${API_URL}/api/admin/subjects`, { headers: getAuthHeader() })
      .then((res) => { if (res.data.success) setSubjects(res.data.data); })
      .catch(() => {});
  }, []);

  const loadStudents = useCallback(async () => {
    const params = selectedClass ? { classId: selectedClass } : {};
    try {
      const res = await axios.get(`${API_URL}/api/admin/students`, {
        headers: getAuthHeader(),
        params,
      });
      if (res.data.success) setStudents(res.data.data);
    } catch {
      // Existing list loading behavior intentionally stays silent.
    }
  }, [selectedClass]);

  // NEW: reload students when selected class or tab changes
  useEffect(() => {
    if (tab === "students") loadStudents();
  }, [tab, loadStudents]);

  const loadTeachers = useCallback(async () => {
    const params = selectedSubject ? { subjectId: selectedSubject } : {};
    try {
      const res = await axios.get(`${API_URL}/api/admin/teachers`, {
        headers: getAuthHeader(),
        params,
      });
      if (res.data.success) setTeachers(res.data.data);
    } catch {
      // Existing list loading behavior intentionally stays silent.
    }
  }, [selectedSubject]);

  // NEW: reload teachers when selected subject or tab changes
  useEffect(() => {
    if (tab === "teachers") loadTeachers();
  }, [tab, loadTeachers]);

  function openEditor(userType, user = null) {
    setEditor({ userType, user });
    setEditorError("");
    setActionMessage("");
  }

  function closeEditor() {
    if (editorBusy) return;
    setEditor(null);
    setEditorError("");
  }

  async function handleUserSubmit(payload) {
    if (!editor) return;
    const collection = editor.userType === "student" ? "students" : "teachers";
    const editing = Boolean(editor.user);
    const endpoint = `${API_URL}/api/admin/${collection}${editing ? `/${editor.user.id}` : ""}`;

    setEditorBusy(true);
    setEditorError("");
    try {
      if (editing) {
        await axios.patch(endpoint, payload, { headers: getAuthHeader() });
      } else {
        await axios.post(endpoint, payload, { headers: getAuthHeader() });
      }
      setEditor(null);
      setActionMessage(editing ? t.userUpdated : t.userCreated);
      if (editor.userType === "student") await loadStudents();
      else await loadTeachers();
    } catch (error) {
      const status = error.response?.status;
      setEditorError(status === 409
        ? t.emailConflict
        : status === 400
          ? t.invalidUserData
          : status === 404
            ? t.relatedSelectionMissing
            : t.userSaveError);
    } finally {
      setEditorBusy(false);
    }
  }

  // NEW: delete a user and remove them from the displayed list
  async function handleDelete(id, listSetter) {
    if (!window.confirm(t.confirmDeleteUser)) return;
    try {
      await axios.delete(`${API_URL}/api/admin/users/${id}`, { headers: getAuthHeader() });
      listSetter((prev) => prev.filter((u) => u.id !== id));
    } catch {
      alert(t.deleteUserError);
    }
  }

  // --- original handlers (unchanged) ---

  // Called when a file is selected
  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setMessage("");
    setMessageType("");
    setImportResult(null);
    readFile(f);
  }

  // Reads Excel file and creates preview
  function readFile(f) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      setPreview(rows.slice(0, 5)); // Only first 5 rows
      setMessage("");
      setMessageType("");
      setImportResult(null);
    };
    reader.onerror = () => {
      setPreview([]);
      setMessage(t.importNoRows);
      setMessageType("error");
      setImportResult(null);
    };
    reader.readAsArrayBuffer(f);
  }

  function validateImportPreview() {
    if (preview.length === 0) {
      return { valid: false, message: t.importNoRows };
    }

    const expectedColumns = role === "teachers" ? IMPORT_COLUMNS.teachers : IMPORT_COLUMNS.students;
    const headers = Object.keys(preview[0]);
    const missing = expectedColumns.filter((column) => !headers.includes(column));

    if (missing.length > 0) {
      return {
        valid: false,
        message: formatImportMessage(t.importMissingHeaders, { columns: missing.join(", ") }),
      };
    }

    return { valid: true };
  }

  // Sends file to backend
  async function handleUpload() {
    if (!file) {
      setMessage(t.noFile);
      setMessageType("error");
      setImportResult(null);
      return;
    }

    const previewValidation = validateImportPreview();
    if (!previewValidation.valid) {
      setMessage(previewValidation.message);
      setMessageType("error");
      setImportResult(null);
      return;
    }

    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      setMessage(t.serverError);
      setMessageType("error");
      setImportResult(null);
      return;
    }

    const formData = new FormData(); // FormData for file upload
    formData.append("file", file);

    // Endpoint depending on role
    const endpoint =
      role === "teachers"
        ? `${API_URL}/api/admin/import/teachers`
        : `${API_URL}/api/admin/import/students`;

    try {
      const res = await axios.post(endpoint, formData, {
        headers: {
          Authorization: `Bearer ${token}`, // Authentication
        },
      });

      if (!res.data?.success) {
        setMessage(t.uploadError);
        setMessageType("error");
        setImportResult(null);
        return;
      }

      const responseData = res.data?.data || {};
      const hasStatusArrays = Array.isArray(responseData.created) || Array.isArray(responseData.updated);
      const created = Array.isArray(responseData.created) ? responseData.created : [];
      const updated = Array.isArray(responseData.updated) ? responseData.updated : [];
      // Keep compatibility with older backend responses while preferring the
      // explicit created/updated result returned by the upsert import API.
      const imported = hasStatusArrays
        ? [...created, ...updated]
        : (Array.isArray(responseData.success) ? responseData.success : []);
      const failed = Array.isArray(res.data?.data?.failed) ? res.data.data.failed : [];
      const resultType = imported.length > 0
        ? (failed.length > 0 ? "warning" : "success")
        : (failed.length > 0 ? "error" : "empty");

      setImportResult({ type: resultType, imported, created, updated, failed, hasStatusArrays });
      setMessage("");
      setMessageType("");
      if (imported.length > 0) {
        setFile(null);
        setPreview([]);
      }
    } catch {
      setMessage(t.serverError);
      setMessageType("error");
      setImportResult(null);
    }
  }

  // Drag-and-drop upload
  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      setMessage("");
      setMessageType("");
      setImportResult(null);
      readFile(f);
    }
  }

  // --- render ---
  return (
    <div className="upload-page">
      {/* NEW: added class "wide" to accommodate tables */}
      <div className="upload-card wide">

        {/* NEW: tab navigation */}
        <div className="admin-tabs">
          <button
            className={tab === "import" ? "tab-btn active" : "tab-btn"}
            onClick={() => setTab("import")}
          >
            📦 {t.userImport || "Import"}
          </button>
          <button
            className={tab === "students" ? "tab-btn active" : "tab-btn"}
            onClick={() => setTab("students")}
          >
            🎓 {t.roleStudents || "Schüler"}
          </button>
          <button
            className={tab === "teachers" ? "tab-btn active" : "tab-btn"}
            onClick={() => setTab("teachers")}
          >
            👨‍🏫 {t.roleTeachers || "Lehrer"}
          </button>
        </div>

        {/* NEW: original import UI wrapped in tab condition — content unchanged */}
        {tab === "import" && (
          <>
            <h2>📦 {t.userImport}</h2>
            <p className="text-muted">{t.uploadHint}</p>

            {/* Role selection (students or teachers) */}
            <div className="role-toggle">
              <label>
                <input
                  type="radio"
                  value="students"
                  checked={role === "students"}
                  onChange={() => setRole("students")}
                />{" "}
                {t.roleStudents}
              </label>
              <label>
                <input
                  type="radio"
                  value="teachers"
                  checked={role === "teachers"}
                  onChange={() => setRole("teachers")}
                />{" "}
                {t.roleTeachers}
              </label>
            </div>

            {/* Upload area */}
            <div
              className="drop-zone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => document.getElementById("fileInput").click()}
            >
              {file ? <p>{file.name}</p> : <p>📁 {t.dragHere}</p>}
              <input id="fileInput" type="file" accept=".xlsx" hidden onChange={handleFile} />
            </div>

            {/* Preview of first rows */}
            {preview.length > 0 && (
              <>
                <p className="preview-title">{t.previewTitle || "Preview (first 5 rows)"}</p>
                <div className="table-responsive">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        {Object.keys(preview[0]).map((key) => (
                          <th key={key}>{getPreviewHeaderLabel(key, t)}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((val, j) => (
                            <td key={j}>{val}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Upload button */}
            <button className="btn-upload" onClick={handleUpload}>
              📤 {t.uploadButton}
            </button>

            {/* Status message */}
            {message && <p className={`upload-message ${messageType}`}>{message}</p>}
            {importResult && (
              <div
                className={`import-result import-result-${importResult.type}`}
                role={importResult.type === "error" ? "alert" : "status"}
              >
                <p className="import-result-summary">
                  {importResult.type === "success"
                    ? (importResult.hasStatusArrays
                      ? formatImportMessage(t.importCreatedUpdated, {
                        created: importResult.created.length,
                        updated: importResult.updated.length,
                      })
                      : formatImportMessage(t.importSuccessCount, { count: importResult.imported.length }))
                    : importResult.type === "warning"
                      ? (importResult.hasStatusArrays
                        ? formatImportMessage(t.importPartialCreatedUpdated, {
                          created: importResult.created.length,
                          updated: importResult.updated.length,
                          failed: importResult.failed.length,
                        })
                        : formatImportMessage(t.importPartial, {
                          success: importResult.imported.length,
                          failed: importResult.failed.length,
                        }))
                      : importResult.type === "error"
                        ? t.importNone
                        : t.importNoRows}
                </p>
                {importResult.failed.length > 0 && (
                  <>
                    <p className="import-failed-title">{t.importFailedRows}</p>
                    <ul className="import-failed-list">
                      {importResult.failed.map((item, index) => (
                        <li key={`${index}-${item.reason || "error"}`}>
                          {formatImportMessage(t.importRowReason, {
                            row: index + 2,
                            reason: item.reason || t.uploadError,
                          })}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* NEW: students tab — filter by class, display table with delete */}
        {tab === "students" && (
          <>
            <div className="admin-section-header">
              <h2>🎓 {t.roleStudents || "Schüler"}</h2>
              <button type="button" className="btn-add-user" onClick={() => openEditor("student")}>
                {t.addStudent}
              </button>
            </div>

            {/* Class filter dropdown */}
            <div className="filter-row">
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="">{t.allClasses || "— Alle Klassen —"}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({formatSchoolYear(c.year)})
                  </option>
                ))}
              </select>
            </div>
            {actionMessage && <p className="admin-action-message" role="status">{actionMessage}</p>}

            {/* Students table */}
            <div className="table-responsive">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>{t.firstName || "Vorname"}</th>
                    <th>{t.lastName || "Nachname"}</th>
                    <th>{t.email || "E-Mail"}</th>
                    <th>{t.classLbl || "Klasse"}</th>
                    <th>{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", color: "#999" }}>
                        {t.noEntries}
                      </td>
                    </tr>
                  ) : (
                    students.map((u) => (
                      <tr key={u.id}>
                        <td>{u.firstName}</td>
                        <td>{u.lastName}</td>
                        <td>{u.email}</td>
                        <td>
                          {u.userClasses
                            .map((uc) => `${uc.class.name} (${formatSchoolYear(uc.class.year)})`)
                            .join(", ")}
                        </td>
                        <td className="admin-actions">
                          <button
                            type="button"
                            className="btn-edit"
                            onClick={() => openEditor("student", u)}
                          >
                            {t.edit}
                          </button>
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={() => handleDelete(u.id, setStudents)}
                            aria-label={`${t.deleteLbl} ${u.firstName} ${u.lastName}`}
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* NEW: teachers tab — filter by subject, display table with delete */}
        {tab === "teachers" && (
          <>
            <div className="admin-section-header">
              <h2>👨‍🏫 {t.roleTeachers || "Lehrer"}</h2>
              <button type="button" className="btn-add-user" onClick={() => openEditor("teacher")}>
                {t.addTeacher}
              </button>
            </div>

            {/* Subject filter dropdown */}
            <div className="filter-row">
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                <option value="">{t.allSubjects}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
            {actionMessage && <p className="admin-action-message" role="status">{actionMessage}</p>}

            {/* Teachers table */}
            <div className="table-responsive">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>{t.firstName || "Vorname"}</th>
                    <th>{t.lastName || "Nachname"}</th>
                    <th>{t.email || "E-Mail"}</th>
                    <th>{t.classesLabel}</th>
                    <th>{t.subjectsLabel}</th>
                    <th>{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", color: "#999" }}>
                        {t.noEntries}
                      </td>
                    </tr>
                  ) : (
                    teachers.map((u) => (
                      <tr key={u.id}>
                        <td>{u.firstName}</td>
                        <td>{u.lastName}</td>
                        <td>{u.email}</td>
                        <td className="admin-teacher-classes">
                          {(u.userClasses || [])
                            .map((uc) => `${uc.class.name} (${formatSchoolYear(uc.class.year)})`)
                            .join(", ") || "—"}
                        </td>
                        <td>{u.userSubjects.map((us) => us.subject.code).join(", ")}</td>
                        <td className="admin-actions">
                          <button
                            type="button"
                            className="btn-edit"
                            onClick={() => openEditor("teacher", u)}
                          >
                            {t.edit}
                          </button>
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={() => handleDelete(u.id, setTeachers)}
                            aria-label={`${t.deleteLbl} ${u.firstName} ${u.lastName}`}
                          >
                            🗑
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

      </div>
      <AdminUserModal
        open={Boolean(editor)}
        userType={editor?.userType}
        user={editor?.user}
        classes={classes}
        subjects={subjects}
        busy={editorBusy}
        error={editorError}
        t={t}
        onClose={closeEditor}
        onSubmit={handleUserSubmit}
      />
    </div>
  );
}
