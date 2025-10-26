import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import Navbar from "../components/Navbar";
import { useState, useEffect } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import "./admin.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function UploadUsers() {
  const [lang] = useLang(); // 🔹 подписываемся на контекст
  const t = T[lang] || T.en;

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    console.log("🌐 Sprache geändert:", lang);
  }, [lang]);

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    readFile(f);
  }

  function readFile(f) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      setPreview(rows.slice(0, 5));
    };
    reader.readAsArrayBuffer(f);
  }

  async function handleUpload() {
    if (!file) return setMessage(t.noFile || "Bitte wählen Sie eine Datei aus");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${API_URL}/api/admin/import/students`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success) {
        setMessage(t.success || "✅ Import erfolgreich!");
        setFile(null);
        setPreview([]);
      } else {
        setMessage(t.uploadError || "❌ Fehler beim Hochladen");
      }
    } catch (err) {
      console.error(err);
      setMessage(t.serverError || "⚠️ Serverfehler");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      readFile(f);
    }
  }

  return (
    <>
      {/* Основной контент */}
      <div className="upload-page">
        <div className="upload-card">
          <h2>📦 {t.userImport || "Benutzerimport"}</h2>
          <p className="text-muted">
            {t.uploadHint ||
              "Ziehen Sie eine Excel-Datei hierher oder klicken Sie, um sie auszuwählen."}
          </p>

          <div
            className="drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => document.getElementById("fileInput").click()}
          >
            {file ? (
              <p>{file.name}</p>
            ) : (
              <p>📁 {t.dragHere || "Datei hierher ziehen oder klicken"}</p>
            )}
            <input
              id="fileInput"
              type="file"
              accept=".xlsx"
              hidden
              onChange={handleFile}
            />
          </div>

          {preview.length > 0 && (
            <table className="preview-table">
              <thead>
                <tr>
                  {Object.keys(preview[0]).map((key) => (
                    <th key={key}>{key}</th>
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
          )}

          <button className="btn-upload" onClick={handleUpload}>
            📤 {t.uploadButton || "Daten hochladen"}
          </button>

          {message && <p className="upload-message">{message}</p>}
        </div>
      </div>
    </>
  );
}
