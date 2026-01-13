import { useLang } from "../context/LanguageContext"; // DE: Sprachkontext / RU: Контекст языка
import T from "../i18n"; // DE: Übersetzungen / RU: Переводы
import { useState } from "react"; // DE: React Hooks / RU: Хуки React
import axios from "axios"; // DE: HTTP-Anfragen / RU: HTTP-запросы
import * as XLSX from "xlsx"; // DE: Excel-Dateien verarbeiten / RU: Работа с Excel-файлами
import "./admin.css"; // DE: Styles / RU: Стили

const API_URL = import.meta.env.VITE_API_URL || ""; // DE: Basis-URL des Backends / RU: Базовый адрес backend-сервера

function getPreviewHeaderLabel(key, t) {
  const map = {
    vorname: t.firstName,
    nachname: t.lastName,
    email: t.email,
    klasse: t.classLbl,
    jahrgang: t.gradeLevel,
    fach_kuerzel: t.subjectAbbrev,
  };

  return map[key] || key;
}

export default function UploadUsers() {
  const [lang] = useLang(); // DE: Aktuelle Sprache / RU: Текущий язык
  const t = T[lang] || T.en; // DE: Übersetzungstabellen / RU: Таблица переводов

  // DE: Zustand (State) / RU: Состояния компонента
  const [file, setFile] = useState(null); // DE: Ausgewählte Datei / RU: Выбранный файл
  const [preview, setPreview] = useState([]); // DE: Vorschau der Daten / RU: Предпросмотр данных
  const [message, setMessage] = useState(""); // DE: Statusmeldung / RU: Сообщение о статусе
  const [role, setRole] = useState("students"); // DE: Rolle (Schüler oder Lehrer) / RU: Роль (ученик или учитель)

  // DE: Wird aufgerufen, wenn Datei ausgewählt wird / RU: Вызывается при выборе файла
  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    readFile(f);
  }

  // DE: Liest Excel-Datei und erstellt Vorschau / RU: Считывает Excel-файл и показывает предпросмотр
  function readFile(f) {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet);
      setPreview(rows.slice(0, 5)); // DE: Nur erste 5 Zeilen / RU: Только первые 5 строк
    };
    reader.readAsArrayBuffer(f);
  }

  // DE: Datei an Backend senden / RU: Отправка файла на сервер
  async function handleUpload() {
    if (!file) return setMessage(t.noFile);

    const token = localStorage.getItem("token");
    if (!token) {
      setMessage(t.serverError);
      return;
    }

    const formData = new FormData(); // DE: FormData für Dateiübertragung / RU: Объект для передачи файла
    formData.append("file", file);

    // DE: Endpunkt je nach Rolle / RU: Определение эндпойнта в зависимости от роли
    const endpoint =
      role === "teachers"
        ? `${API_URL}/api/admin/import/teachers`
        : `${API_URL}/api/admin/import/students`;

    try {
      const res = await axios.post(endpoint, formData, {
        headers: {
          // Let axios/browser set the correct multipart boundary automatically
          Authorization: `Bearer ${token}`, // DE: Authentifizierung / RU: Авторизация
        },
      });

      // DE: Erfolg / RU: Успешная загрузка
      if (res.data.success) {
        setMessage(t.success);
        setFile(null);
        setPreview([]);
      } else {
        setMessage(t.uploadError);
      }
    } catch (err) {
      console.error(err);
      setMessage(t.serverError);
    }
  }

  // DE: Drag-and-Drop Upload / RU: Загрузка через перетаскивание
  function handleDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      readFile(f);
    }
  }

  // DE: Benutzeroberfläche / RU: Интерфейс страницы
  return (
    <div className="upload-page">
      <div className="upload-card">
        <h2>📦 {t.userImport}</h2>
        <p className="text-muted">{t.uploadHint}</p>

        {/* DE: Rollenwahl (Schüler oder Lehrer) / RU: Выбор роли (ученик или учитель) */}
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

        {/* DE: Bereich zum Hochladen / RU: Зона для загрузки файла */}
        <div
          className="drop-zone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => document.getElementById("fileInput").click()}
        >
          {file ? <p>{file.name}</p> : <p>📁 {t.dragHere}</p>}
          <input id="fileInput" type="file" accept=".xlsx" hidden onChange={handleFile} />
        </div>

        {/* DE: Vorschau der ersten Zeilen / RU: Предпросмотр первых строк */}
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

        {/* DE: Upload-Button / RU: Кнопка загрузки */}
        <button className="btn-upload" onClick={handleUpload}>
          📤 {t.uploadButton}
        </button>

        {/* DE: Statusmeldung / RU: Сообщение о результате */}
        {message && <p className="upload-message">{message}</p>}
      </div>
    </div>
  );
}
