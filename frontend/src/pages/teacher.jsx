import { useState } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./teacher.css";

import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import LanguageSwitcher from "../components/LanguageSwitcher";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Teacher() {
  const [lang] = useLang();
  const t = T[lang] || T.en;

  // form state
  const [klass, setKlass] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [due, setDue] = useState("");

  // files (drag & drop + file input)
  const [files, setFiles] = useState([]);      // File[]
  const [isOver, setIsOver] = useState(false); // dnd highlight
  const [msg, setMsg] = useState("");

  function addFiles(fileList) {
    // превращаем FileList в массив и добавляем уникальные по имени+size
    const incoming = Array.from(fileList || []);
    setFiles(prev => {
      const map = new Map(prev.map(f => [f.name + "_" + f.size, f]));
      for (const f of incoming) map.set(f.name + "_" + f.size, f);
      return Array.from(map.values());
    });
  }

  function onDrop(e) {
    e.preventDefault();
    setIsOver(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");

    try {
      const fd = new FormData();
      fd.append("class", klass);
      fd.append("subject", subject);
      fd.append("title", title);
      fd.append("text", text);
      fd.append("dueDate", due);
      files.forEach((f) => fd.append("files", f));

      const token = localStorage.getItem("token"); // если есть
      await axios.post(`${API_URL}/api/teacher/assignments`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      setMsg(t.assgnSaved);
      // очистка
      setKlass(""); setSubject(""); setTitle(""); setText(""); setDue(""); setFiles([]);
    } catch (err) {
      console.error(err);
      setMsg(t.assgnError);
    }
  }

  return (
    <div className="container py-4">

      <div className="card shadow-lg border-0 rounded-4 p-4 mx-auto teacher-card">
        <div className="card-body">
          <h2 className="text-center mb-4 fw-bold">
            {t.teacherPanel}
          </h2>

          <form onSubmit={onSubmit} className="vstack gap-3">
            {/* Class */}
            <div>
              <label className="form-label fw-semibold">{t.classLbl}</label>
              <select className="form-select" value={klass} onChange={(e)=>setKlass(e.target.value)} required>
                <option value="">{t.selectPlaceholder}</option>
                <option value="AKIFT2025">AKIFT2025</option>
                <option value="2025AKIFT">2025AKIFT</option>
                <option value="1A">1A</option>
                <option value="2B">2B</option>
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="form-label fw-semibold">{t.subjectLbl}</label>
              <select className="form-select" value={subject} onChange={(e)=>setSubject(e.target.value)} required>
                <option value="">{t.selectPlaceholder}</option>
                <option value="Deutsch">Deutsch</option>
                <option value="Englisch">Englisch</option>
                <option value="Mathematik">Mathematik</option>
                <option value="Informatik">Informatik</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="form-label fw-semibold">{t.titleLbl}</label>
              <input
                className="form-control"
                type="text"
                placeholder={t.titlePh}
                value={title}
                onChange={(e)=>setTitle(e.target.value)}
                required
              />
            </div>

            {/* Text */}
            <div>
              <label className="form-label fw-semibold">{t.textLbl}</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder={t.textPh}
                value={text}
                onChange={(e)=>setText(e.target.value)}
                required
              />
            </div>

            {/* Drag & Drop */}
            <div>
              <label className="form-label fw-semibold">{t.filesLbl}</label>

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
                <ul className="list-group mt-2">
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

            {/* Due date */}
            <div>
              <label className="form-label fw-semibold">{t.dueLbl}</label>
              <input
                className="form-control"
                type="date"
                value={due}
                onChange={(e)=>setDue(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary mt-2 py-2 fw-semibold">
              {t.saveAssgn}
            </button>
          </form>

          {msg && <div className="alert alert-info text-center mt-3">{msg}</div>}
        </div>
      </div>
    </div>
  );
}
