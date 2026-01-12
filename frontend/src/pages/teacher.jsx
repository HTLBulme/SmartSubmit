import { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";
import "./teacher.css";

import { useLang } from "../context/LanguageContext";
import T from "../i18n";

const API_URL = import.meta.env.VITE_API_URL || "";   // verbindung mit backend http://localhost:3000

// Lehrer-Seite / Teacher page / Страница учителя
export default function Teacher() {
  const [lang] = useLang();
  const t = T[lang] || T.en;

  // Formularstatus / Form state / Состояние формы
  const [klass, setKlass] = useState("");
  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [link, setLink] = useState("");

  // Dateien (Drag & Drop + Dateiauswahl) / Files (drag & drop + file input) / Файлы (drag & drop и выбор)
  const [files, setFiles] = useState([]);      // File[]
  const [isOver, setIsOver] = useState(false); // dnd highlight
  const [msg, setMsg] = useState("");

  // Klassen, Fächer, Aufgaben / Classes, subjects, assignments / Классы, предметы, задания
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [showAssignments, setShowAssignments] = useState(false);

  // Dateien zur Liste hinzufügen / Add files to list / Добавить файлы в список
  function addFiles(fileList) {
    // DE: FileList in Array umwandeln und nur einzigartige (Name+Größe) hinzufügen
    // EN: Convert FileList to array and add only unique (name+size)
    // RU: Преобразуем FileList в массив и добавляем только уникальные (имя+размер)
    const incoming = Array.from(fileList || []);
    setFiles(prev => {
      const map = new Map(prev.map(f => [f.name + "_" + f.size, f]));
      for (const f of incoming) map.set(f.name + "_" + f.size, f);
      return Array.from(map.values());
    });
  }

  // Drag & Drop-Handler / Drag & drop handler / Обработчик drag & drop
  function onDrop(e) {
    e.preventDefault();
    setIsOver(false);
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  }

  // Formular absenden / Submit form / Отправка формы
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

      const token = localStorage.getItem("token"); // DE: falls vorhanden / EN: if exists / RU: если есть
      await axios.post(`${API_URL}/api/teacher/assignments`, fd, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      setMsg(t.assgnSaved);
      fetchAssignments();
      setKlass(""); setSubject(""); setTitle(""); setText(""); setDue(""); setFiles([]);
    } catch (err) {
      console.error(err);
      setMsg(t.assgnError);
    }
  }
  // Aufgaben vom Server laden / Fetch assignments from server / Загрузить задания с сервера
  async function fetchAssignments() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${API_URL}/api/teacher/assignments`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAssignments(res.data.data || []);
      } catch (err) {
        console.error("Ошибка загрузки заданий:", err);
      }
    }

  // Initiales Laden der Daten / Initial data load / Первичная загрузка данных
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

  // Handler für Abgabenliste / Handler for submissions list / Обработчик списка сдач
  function handleAbgabenClick() {
    alert(t.abgabenBtn);
  }
  // Handler für Aufgabenliste / Handler for assignments list / Обработчик списка заданий
  function handleAssignmentClick() {
    setShowAssignments((prev) => !prev);
  }

  // Render / Rendering / Отрисовка
  return (
    <div className="teacher-page">

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
                {Array.isArray(classes) && Array.from(new Map(classes.map(c => [c.name, c])).values()).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="form-label fw-semibold">{t.subjectLbl}</label>
              <select className="form-select" value={subject} onChange={(e)=>setSubject(e.target.value)} required>
                <option value="">{t.selectPlaceholder}</option>
                {Array.isArray(subjects) && Array.from(new Map(subjects.map(s => [s.name, s])).values()).map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
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

              {/* Link input */}
              <div>
                <label className="form-label fw-semibold">{t.linkLbl}</label>
                <input
                  className="form-control"
                  type="url"
                  placeholder={t.linkPh}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                />
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

          {/* Aufgabenlisten-Knopf / Assignments list button / Кнопка для списка заданий */}
          {/* ...удалено... */}

          {/* Aufgabenliste des Lehrers / Teacher's assignments list / Список заданий учителя */}
          {showAssignments && (
            <div className="mb-4">
              <h5 className="fw-bold mb-3">{t.assignmentBtn}</h5>
              {assignments.length === 0 ? (
                <div className="text-muted">{t.noAssignments}</div>
              ) : (
                  <div className="table-responsive" style={{maxHeight: '400px', overflowY: 'auto', overflowX: 'auto'}}>
                    <table className="table table-bordered align-middle" style={{minWidth: '900px'}}>
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
                      </tr>
                    </thead>
                    <tbody>
                        {assignments.map((a, idx) => (
                          <tr key={a.id}>
                            <td>{idx + 1}</td>
                            <td>{a.titel}</td>
                            <td>{a.klasse}</td>
                            <td>{a.fach}</td>
                            <td>{a.termin ? new Date(a.termin).toLocaleDateString() : ''}</td>
                            <td>
                              {a.status === 'active' ? (
                                <span className="badge bg-success">{t.status} ✓</span>
                              ) : (
                                <span className="badge bg-danger">{t.status} ✗</span>
                              )}
                            </td>
                            <td>
                              <button type="button" className="btn btn-sm btn-outline-primary" onClick={()=>alert(`Abgabenliste für Aufgabe ${a.titel}`)}>
                                {t.abgabenBtn}
                              </button>
                            </td>
                            <td>{a.abgabenCount}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {/* Statusmeldung / Status message / Сообщение о состоянии */}  

          {msg && <div className="alert alert-info text-center mt-3">{msg}</div>}
          {/* 'Aufgabenliste' */}
          <div className="d-flex justify-content-center gap-3 mt-5">
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