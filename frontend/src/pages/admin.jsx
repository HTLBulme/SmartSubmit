import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import { useState, useEffect } from "react"; // NEW: added useEffect
import axios from "axios";
import * as XLSX from "xlsx";
import "./admin.css";

const API_URL = import.meta.env.VITE_API_URL || "";

function getPreviewHeaderLabel(key, t) {
  const map = {
    vorname: t.firstName,
    nachname: t.lastName,
    email: t.email,
    className: t.classLbl,
    jahrgang: t.gradeLevel,
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
  const [role, setRole] = useState("students");

  // NEW: state for students tab
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [students, setStudents] = useState([]);

  // NEW: state for teachers tab
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [teachers, setTeachers] = useState([]);

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

  // NEW: reload students when selected class or tab changes
  useEffect(() => {
    if (tab !== "students") return;
    const params = selectedClass ? { classId: selectedClass } : {};
    axios
      .get(`${API_URL}/api/admin/students`, { headers: getAuthHeader(), params })
      .then((res) => { if (res.data.success) setStudents(res.data.data); })
      .catch(() => {});
  }, [selectedClass, tab]);

  // NEW: reload teachers when selected subject or tab changes
  useEffect(() => {
    if (tab !== "teachers") return;
    const params = selectedSubject ? { subjectId: selectedSubject } : {};
    axios
      .get(`${API_URL}/api/admin/teachers`, { headers: getAuthHeader(), params })
      .then((res) => { if (res.data.success) setTeachers(res.data.data); })
      .catch(() => {});
  }, [selectedSubject, tab]);

  // NEW: delete a user and remove them from the displayed list
  async function handleDelete(id, listSetter) {
    if (!window.confirm("Wirklich löschen?")) return;
    try {
      await axios.delete(`${API_URL}/api/admin/users/${id}`, { headers: getAuthHeader() });
      listSetter((prev) => prev.filter((u) => u.id !== id));
    } catch {
      alert("Fehler beim Löschen.");
    }
  }

  // --- original handlers (unchanged) ---

  // Called when a file is selected
  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
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
    };
    reader.readAsArrayBuffer(f);
  }

  // Sends file to backend
  async function handleUpload() {
    if (!file) return setMessage(t.noFile);

    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    if (!token) {
      setMessage(t.serverError);
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

      // Success
      if (res.data.success) {
        setMessage(t.success);
        setFile(null);
        setPreview([]);
      } else {
        setMessage(t.uploadError);
      }
    } catch (err) {
      setMessage(t.serverError);
    }
  }

  // Drag-and-drop upload
  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
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
              </>
            )}

            {/* Upload button */}
            <button className="btn-upload" onClick={handleUpload}>
              📤 {t.uploadButton}
            </button>

            {/* Status message */}
            {message && <p className="upload-message">{message}</p>}
          </>
        )}

        {/* NEW: students tab — filter by class, display table with delete */}
        {tab === "students" && (
          <>
            <h2>🎓 {t.roleStudents || "Schüler"}</h2>

            {/* Class filter dropdown */}
            <div className="filter-row">
              <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}>
                <option value="">— Alle Klassen —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.year})
                  </option>
                ))}
              </select>
            </div>

            {/* Students table */}
            <table className="preview-table">
              <thead>
                <tr>
                  <th>{t.firstName || "Vorname"}</th>
                  <th>{t.lastName || "Nachname"}</th>
                  <th>{t.email || "E-Mail"}</th>
                  <th>{t.classLbl || "Klasse"}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "#999" }}>
                      Keine Einträge
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
                          .map((uc) => `${uc.class.name} (${uc.class.year})`)
                          .join(", ")}
                      </td>
                      <td>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(u.id, setStudents)}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}

        {/* NEW: teachers tab — filter by subject, display table with delete */}
        {tab === "teachers" && (
          <>
            <h2>👨‍🏫 {t.roleTeachers || "Lehrer"}</h2>

            {/* Subject filter dropdown */}
            <div className="filter-row">
              <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)}>
                <option value="">— Alle Fächer —</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Teachers table */}
            <table className="preview-table">
              <thead>
                <tr>
                  <th>{t.firstName || "Vorname"}</th>
                  <th>{t.lastName || "Nachname"}</th>
                  <th>{t.email || "E-Mail"}</th>
                  <th>Fächer</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {teachers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "#999" }}>
                      Keine Einträge
                    </td>
                  </tr>
                ) : (
                  teachers.map((u) => (
                    <tr key={u.id}>
                      <td>{u.firstName}</td>
                      <td>{u.lastName}</td>
                      <td>{u.email}</td>
                      <td>{u.userSubjects.map((us) => us.subject.code).join(", ")}</td>
                      <td>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(u.id, setTeachers)}
                        >
                          🗑
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}

      </div>
    </div>
  );
}