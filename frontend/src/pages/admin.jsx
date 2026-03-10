import { useLang } from "../context/LanguageContext"; // Language context
import T from "../i18n"; // Translations
import { useState } from "react"; // React hooks
import axios from "axios"; // HTTP requests
import * as XLSX from "xlsx"; // Excel file processing
import "./admin.css"; // Styles

const API_URL = import.meta.env.VITE_API_URL || ""; // Base URL of backend

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

export default function UploadUsers() {
  const [lang] = useLang(); // Current language
  const t = T[lang] || T.en; // Translation table

  // State
  const [file, setFile] = useState(null); // Selected file
  const [preview, setPreview] = useState([]); // Data preview
  const [message, setMessage] = useState(""); // Status message
  const [role, setRole] = useState("students"); // Role (students or teachers)

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
          // Let axios/browser set the correct multipart boundary automatically
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

  // User interface
  return (
    <div className="upload-page">
      <div className="upload-card">
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
      </div>
    </div>
  );
}
