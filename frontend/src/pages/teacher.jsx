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


function sanitizeZipPart(value, fallback = "datei") {
  const cleaned = String(value || "")
    .normalize("NFKC")
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\.+|\.+$/g, "");

  return cleaned || fallback;
}

function getSubmissionStudentFolderName(submission) {
  const firstName = submission?.student?.firstName || "";
  const lastName = submission?.student?.lastName || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName) return sanitizeZipPart(titleCaseWords(fullName), "student");

  const email = submission?.student?.email;
  if (typeof email === "string" && email.includes("@")) {
    return sanitizeZipPart(email.split("@")[0].replace(/[._-]+/g, " "), "student");
  }

  return sanitizeZipPart(`student_${submission?.id || "files"}`, "student");
}


function formatSubmissionDateParts(value) {
  if (!value) return { date: "", time: "" };

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "", time: "" };

  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}

function getSubmissionStudentDisplayName(submission) {
  const firstName = submission?.student?.firstName || "";
  const lastName = submission?.student?.lastName || "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName) return fullName;

  const email = submission?.student?.email;
  if (typeof email === "string" && email.includes("@")) return email.split("@")[0];

  return "—";
}

function addFileNameSuffix(fileName, suffix) {
  const dotIndex = fileName.lastIndexOf(".");
  if (dotIndex <= 0) return `${fileName}${suffix}`;
  return `${fileName.slice(0, dotIndex)}${suffix}${fileName.slice(dotIndex)}`;
}

function makeUniqueZipPath(folderName, fileName, usedPaths) {
  let candidateName = fileName;
  let candidatePath = `${folderName}/${candidateName}`;
  let counter = 2;

  while (usedPaths.has(candidatePath.toLocaleLowerCase())) {
    candidateName = addFileNameSuffix(fileName, `_${counter}`);
    candidatePath = `${folderName}/${candidateName}`;
    counter += 1;
  }

  usedPaths.add(candidatePath.toLocaleLowerCase());
  return candidatePath;
}

function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function getFilenameFromContentDisposition(disposition, fallback) {
  if (!disposition || !disposition.includes("filename=")) return fallback;

  const quoted = /filename="([^"]+)"/.exec(disposition);
  if (quoted?.[1]) return quoted[1];

  const unquoted = /filename=([^;]+)/.exec(disposition);
  if (unquoted?.[1]) return unquoted[1].trim();

  return fallback;
}

async function fetchFileBlob(href) {
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  if (token) {
    try {
      const response = await fetch(href, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) return response.blob();
    } catch {
      // Static upload routes can be configured without auth/CORS headers.
      // In that case, retry the same download exactly like the single-file link did before.
    }
  }

  const fallbackResponse = await fetch(href);
  if (!fallbackResponse.ok) throw new Error("Network error");
  return fallbackResponse.blob();
}

let crcTable = null;

function getCrcTable() {
  if (crcTable) return crcTable;

  crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crcTable[n] = c >>> 0;
  }
  return crcTable;
}

function crc32(bytes) {
  const table = getCrcTable();
  let crc = 0xffffffff;

  for (let i = 0; i < bytes.length; i += 1) {
    crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(bytes, offset, value) {
  bytes[offset] = value & 0xff;
  bytes[offset + 1] = (value >>> 8) & 0xff;
  bytes[offset + 2] = (value >>> 16) & 0xff;
  bytes[offset + 3] = (value >>> 24) & 0xff;
}

function getDosDateTime(date = new Date()) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { dosTime, dosDate };
}

async function createStoredZipBlob(entries) {
  const encoder = new TextEncoder();
  const parts = [];
  const centralParts = [];
  const { dosTime, dosDate } = getDosDateTime();
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.path);
    const dataBytes = new Uint8Array(await entry.blob.arrayBuffer());
    const crc = crc32(dataBytes);

    if (nameBytes.length > 0xffff || dataBytes.length > 0xffffffff) {
      throw new Error("ZIP entry is too large");
    }

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0x0800); // UTF-8 filenames
    writeUint16(localHeader, 8, 0); // stored, no compression
    writeUint16(localHeader, 10, dosTime);
    writeUint16(localHeader, 12, dosDate);
    writeUint32(localHeader, 14, crc);
    writeUint32(localHeader, 18, dataBytes.length);
    writeUint32(localHeader, 22, dataBytes.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);

    parts.push(localHeader, dataBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0x0800);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, dosTime);
    writeUint16(centralHeader, 14, dosDate);
    writeUint32(centralHeader, 16, crc);
    writeUint32(centralHeader, 20, dataBytes.length);
    writeUint32(centralHeader, 24, dataBytes.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, offset);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endHeader = new Uint8Array(22);
  writeUint32(endHeader, 0, 0x06054b50);
  writeUint16(endHeader, 4, 0);
  writeUint16(endHeader, 6, 0);
  writeUint16(endHeader, 8, entries.length);
  writeUint16(endHeader, 10, entries.length);
  writeUint32(endHeader, 12, centralSize);
  writeUint32(endHeader, 16, offset);
  writeUint16(endHeader, 20, 0);

  return new Blob([...parts, ...centralParts, endHeader], { type: "application/zip" });
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
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState(() => new Set());
  const [downloadBusyMode, setDownloadBusyMode] = useState("");
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
      setTimeout(() => setMsg(""), 4000);
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

  function handleAssignmentClick() {
    setAssignmentsTab("active");
    setIsAssignmentsOpen(true);
    fetchAssignments();
  }

  function closeAssignmentsModal() {
    setIsAssignmentsOpen(false);
  }


  // Polling for submissions when modal is open
  async function openSubmissionsModal(assignmentId) {
    const shouldRestore = isAssignmentsOpen;
    setRestoreAssignmentsOnClose(shouldRestore);
    if (shouldRestore) setIsAssignmentsOpen(false);

    setSelectedAssignmentId(assignmentId);
    setSelectedSubmissionIds(new Set());
    setIsSubmissionsOpen(true);
    await fetchSubmissions(assignmentId);
  }

  // Polling effect for submissions modal
  useEffect(() => {
    let intervalId = null;
    if (isSubmissionsOpen && selectedAssignmentId) {
      intervalId = setInterval(() => {
        fetchSubmissions(selectedAssignmentId);
      }, 5000); // 5 секунд
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isSubmissionsOpen, selectedAssignmentId]);

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
      setSelectedSubmissionIds((prev) => {
        const validIds = new Set(list.map((submission) => String(submission.id)));
        return new Set(Array.from(prev).filter((id) => validIds.has(id)));
      });

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
    const submission = submissions.find((s) => s.id === submissionId);
    const rawGrade = (draft.grade ?? "").trim();
    const rawFeedback = draft.feedback ?? "";

    // Определяем, что реально изменилось
    const initialGrade = typeof submission?.grade === "number" ? String(submission.grade) : "";
    const initialFeedback = submission?.feedback || "";
    const gradeChanged = rawGrade !== initialGrade;
    const feedbackChanged = rawFeedback !== initialFeedback;

    let grade = null;
    if (rawGrade !== "") {
      const parsed = Number.parseInt(rawGrade, 10);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 100) {
        setGradeDrafts((prev) => ({
          ...prev,
          [submissionId]: {
            ...draft,
            gradeError: t.gradeRange || "Invalid grade (0-100)",
            gradeOk: "",
          },
        }));
        return;
      }
      grade = parsed;
    }

    const feedback = rawFeedback.trim() === "" ? null : rawFeedback;

    // if nothing changed, do nothing (avoid unnecessary API call and UI flicker)
    if (!gradeChanged && !feedbackChanged) return;

    try {
      setGradeDrafts((prev) => ({
        ...prev,
        [submissionId]: {
          ...draft,
          saving: true,
          gradeError: "",
          gradeOk: "",
          feedbackError: "",
          feedbackOk: "",
        },
      }));

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const res = await axios.patch(
        `${API_URL}/api/teacher/submissions/${submissionId}`,
        { grade, feedback },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updated = res.data?.data;
      if (updated) {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === submissionId
              ? { ...s, grade: updated.grade, feedback: updated.feedback }
              : s
          )
        );
      }

      setGradeDrafts((prev) => {
        const prevDraft = prev[submissionId] || {};
        return {
          ...prev,
          [submissionId]: {
            ...prevDraft,
            saving: false,
            gradeError: "",
            gradeOk: gradeChanged ? (t.gradeSaved || "Saved") : prevDraft.gradeOk,
            feedbackError: "",
            feedbackOk: feedbackChanged ? (t.gradeSaved || "Saved") : prevDraft.feedbackOk,
          },
        };
      });
    } catch (err) {
      console.error("Error saving grade:", err);
      setGradeDrafts((prev) => {
        const prevDraft = prev[submissionId] || {};
        return {
          ...prev,
          [submissionId]: {
            ...prevDraft,
            saving: false,
            gradeError: gradeChanged ? (t.gradeError || t.errorSavingGrade || "Save failed") : prevDraft.gradeError,
            gradeOk: gradeChanged ? "" : prevDraft.gradeOk,
            feedbackError: feedbackChanged ? (t.gradeError || t.errorSavingGrade || "Save failed") : prevDraft.feedbackError,
            feedbackOk: feedbackChanged ? "" : prevDraft.feedbackOk,
          },
        };
      });
    }
  }

  function getDownloadableSubmissionFiles(submission) {
    const files = Array.isArray(submission?.files) ? submission.files : [];

    return files
      .map((file, idx) => ({
        file,
        idx,
        href: getSubmissionFileUrl(file),
        label: getSubmissionFileLabel(file),
      }))
      .filter((item) => item.href);
  }

  function submissionHasDownloadableFiles(submission) {
    return getDownloadableSubmissionFiles(submission).length > 0;
  }

  function toggleSubmissionSelection(submissionId, checked) {
    const key = String(submissionId);
    setSelectedSubmissionIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function setAllSubmissionSelection(checked) {
    if (!checked) {
      setSelectedSubmissionIds(new Set());
      return;
    }

    setSelectedSubmissionIds(
      new Set(
        submissions
          .filter(submissionHasDownloadableFiles)
          .map((submission) => String(submission.id))
      )
    );
  }

  async function downloadSubmissionsAsZip(targetSubmissions, filename, busyMode) {
    const usedPaths = new Set();
    const entries = [];

    try {
      setDownloadBusyMode(busyMode);

      for (const submission of targetSubmissions) {
        const folderName = getSubmissionStudentFolderName(submission);
        const downloadableFiles = getDownloadableSubmissionFiles(submission);

        for (const item of downloadableFiles) {
          let blob;
          try {
            blob = await fetchFileBlob(item.href);
          } catch (err) {
            console.error(err);
            throw new Error(`Download failed: ${item.label || item.href}`);
          }

          const safeFileName = sanitizeZipPart(item.label, `file_${item.idx + 1}`);
          const zipPath = makeUniqueZipPath(folderName, safeFileName, usedPaths);
          entries.push({ path: zipPath, blob });
        }
      }

      if (entries.length === 0) {
        alert(t.noFiles || "Keine Dateien");
        return;
      }

      const zipBlob = await createStoredZipBlob(entries);
      downloadBlob(zipBlob, filename);
    } catch (err) {
      console.error(err);
      alert(t.downloadFailed || "Download fehlgeschlagen");
    } finally {
      setDownloadBusyMode("");
    }
  }

  async function downloadCurrentSelectionZip() {
    const currentDownloadableSubmissions = submissions.filter(submissionHasDownloadableFiles);
    const selectedSubmissions = currentDownloadableSubmissions.filter((submission) =>
      selectedSubmissionIds.has(String(submission.id))
    );

    const isWholeClassSelection =
      currentDownloadableSubmissions.length > 0 &&
      selectedSubmissions.length === currentDownloadableSubmissions.length;

    let zipName = "abgaben.zip";
    if (selectedSubmissions.length === 1) {
      // Один ученик: имя архива = имя_класс_предмет_дата.zip
      const folderName = getSubmissionStudentFolderName(selectedSubmissions[0]);
      const className = submissionsMeta?.class?.name
        ? sanitizeZipPart(submissionsMeta.class.name, "klasse")
        : "klasse";
      const subjectName = submissionsMeta?.subject?.name || submissionsMeta?.subject
        ? sanitizeZipPart(submissionsMeta.subject?.name || submissionsMeta.subject, "fach")
        : "fach";
      const dueDate = submissionsMeta?.dueDate
        ? new Date(submissionsMeta.dueDate).toISOString().split("T")[0]
        : "datum";
      zipName = `${folderName}_${className}_${subjectName}_${dueDate}.zip`;
    } else if (isWholeClassSelection && submissionsMeta) {
      const className = submissionsMeta.class?.name
        ? sanitizeZipPart(submissionsMeta.class.name, "klasse")
        : "klasse";
      const subjectName = submissionsMeta.subject?.name || submissionsMeta.subject
        ? sanitizeZipPart(submissionsMeta.subject?.name || submissionsMeta.subject, "fach")
        : "fach";
      const dueDate = submissionsMeta.dueDate
        ? new Date(submissionsMeta.dueDate).toISOString().split("T")[0]
        : "datum";
      zipName = `${className}_${subjectName}_${dueDate}.zip`;
    } else {
      zipName = `ausgewaehlte_abgaben_${selectedAssignmentId}.zip`;
    }
    await downloadSubmissionsAsZip(
      selectedSubmissions,
      zipName,
      "selection"
    );
  }

  function closeSubmissionsModal() {
    setIsSubmissionsOpen(false);
    setSelectedSubmissionIds(new Set());

    if (restoreAssignmentsOnClose) {
      setRestoreAssignmentsOnClose(false);
      setIsAssignmentsOpen(true);
    }
  }

  const downloadableSubmissions = submissions.filter(submissionHasDownloadableFiles);
  const selectedDownloadableSubmissions = submissions.filter(
    (submission) =>
      selectedSubmissionIds.has(String(submission.id)) && submissionHasDownloadableFiles(submission)
  );
  const selectedDownloadableCount = selectedDownloadableSubmissions.length;
  const allDownloadableSelected =
    downloadableSubmissions.length > 0 &&
    downloadableSubmissions.every((submission) => selectedSubmissionIds.has(String(submission.id)));

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
                          <table className="table table-bordered align-middle" style={{ minWidth: "900px" }}>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>{t.titleLbl}</th>
                                <th>{t.materialsLbl || "Materials"}</th>
                                <th>{t.classLbl}</th>
                                <th>{t.subjectLbl}</th>
                                <th>{t.dueLbl}</th>
                                <th>{t.status}</th>
                                <th>{t.submissionsBtn}</th>
                                <th>{t.countLbl}</th>
                                <th>{t.archiveTab}</th>
                                <th>{t.deleteLbl}</th>
                              </tr>
                            </thead>
                            <tbody>
                              {assignments
                                .filter((a) => (assignmentsTab === "archived" ? a.archived : !a.archived))
                                .map((a, idx) => {
                                  // Combine link and files in one column
                                  return (
                                    <tr key={a.id}>
                                      <td>{idx + 1}</td>
                                      <td>{a.title}</td>
                                      <td style={{ minWidth: 120, maxWidth: 220, wordBreak: "break-all" }}>
                                        {/* Link */}
                                        {a.link ? (
                                          <div style={{ marginBottom: Array.isArray(a.attachments) && a.attachments.length > 0 ? 4 : 0 }}>
                                            <a href={a.link} target="_blank" rel="noopener noreferrer" className="d-flex align-items-center gap-1 text-decoration-none">
                                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16" className="text-primary flex-shrink-0">
                                                <path fillRule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
                                                <path fillRule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
                                              </svg>
                                              <span style={{ textDecoration: 'underline' }}>
                                                {/* Показываем последний сегмент URL или сам URL */}
                                                {(() => {
                                                  try {
                                                    const urlObj = new URL(a.link);
                                                    const path = urlObj.pathname;
                                                    if (path && path !== "/") {
                                                      return decodeURIComponent(path.split("/").pop() || a.link);
                                                    }
                                                    return a.link;
                                                  } catch {
                                                    // Если невалидный URL, просто показать как есть
                                                    return a.link;
                                                  }
                                                })()}
                                              </span>
                                            </a>
                                          </div>
                                        ) : null}
                                        {/* Attachments (Dokumente) */}
                                        {Array.isArray(a.attachments) && a.attachments.length > 0 ? (
                                          <div>
                                            {a.attachments.map((f, i) => {
                                              // Use only filename to build relative path
                                              let url = f.filename ? `/uploads/assignments/${f.filename}` : null;
                                              const label = f.originalName || f.filename || (typeof f === "string" ? f : "Datei");
                                              return (
                                                <div key={i}>
                                                  {url ? (
                                                    <a href={url} target="_blank" rel="noopener noreferrer">{label}</a>
                                                  ) : (
                                                    <span>{label}</span>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        ) : null}
                                        {!a.link && (!Array.isArray(a.attachments) || a.attachments.length === 0) && (
                                          <span className="text-muted">—</span>
                                        )}
                                      </td>
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
                                  );
                                })}
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
                        {t.gradesFeedbackTable || "Noten & Feedback"}
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
                        <>
                          <div className="submission-top-actions">
                            <div className="submission-selection-summary">
                              {selectedDownloadableCount > 0
                                ? allDownloadableSelected
                                  ? "Alle ausgewählt"
                                  : `${selectedDownloadableCount} ausgewählt`
                                : "Keine Auswahl"}
                            </div>
                            <div className="submission-top-buttons">
                              <button
                                type="button"
                                className="btn btn-sm btn-success"
                                disabled={selectedDownloadableCount === 0 || downloadBusyMode !== ""}
                                onClick={downloadCurrentSelectionZip}
                                title={
                                  allDownloadableSelected
                                    ? "Ganze Klasse als ZIP herunterladen"
                                    : "Ausgewählte Schüler als ZIP herunterladen"
                                }
                              >
                                {downloadBusyMode === "selection"
                                  ? t.loading || "Loading..."
                                  : allDownloadableSelected
                                  ? "Ganze Klasse als ZIP"
                                  : "Auswahl als ZIP"}
                              </button>
                            </div>
                          </div>
                          <div className="table-responsive submissions-table-responsive">
                            <table className="table table-sm table-bordered align-middle submission-feedback-table">
                              <colgroup>
                                <col className="submission-col-select" />
                                <col className="submission-col-student" />
                                <col className="submission-col-time" style={{ minWidth: '110px', width: '120px' }} />
                                <col className="submission-col-files" />
                                <col className="submission-col-text" style={{ minWidth: '180px', width: '220px' }} />
                                <col className="submission-col-feedback" />
                                <col className="submission-col-grade" />
                                <col className="submission-col-save" style={{ width: '1px', minWidth: '1px', maxWidth: '60px' }} />
                              </colgroup>
                              <thead>
                                <tr>
                                  <th className="submission-select-header">
                                    <input
                                      className="form-check-input submission-select-checkbox"
                                      type="checkbox"
                                      checked={allDownloadableSelected}
                                      disabled={downloadableSubmissions.length === 0}
                                      onChange={(e) => setAllSubmissionSelection(e.target.checked)}
                                      title="Alle Schüler mit Dateien auswählen"
                                      aria-label="Alle Schüler mit Dateien auswählen"
                                    />
                                  </th>
                                  <th>{t.student}</th>
                                  <th>{t.time}</th>
                                  <th>{t.filesLbl}</th>
                                  <th>{t.textLbl}</th>
                                  <th>{t.feedback}</th>
                                  <th>{t.grade}</th>
                                  <th>{t.save}</th>
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
                                const submittedAtParts = formatSubmissionDateParts(s.submittedAt);
                                const studentName = getSubmissionStudentDisplayName(s);
                                const studentEmail = s.student?.email || "";
                                const submissionIdKey = String(s.id);
                                const hasDownloadableFiles = submissionHasDownloadableFiles(s);

                                return (
                                  <tr key={s.id}>
                                    <td className="submission-select-cell">
                                      <input
                                        className="form-check-input submission-select-checkbox"
                                        type="checkbox"
                                        checked={selectedSubmissionIds.has(submissionIdKey)}
                                        disabled={!hasDownloadableFiles}
                                        onChange={(e) => toggleSubmissionSelection(s.id, e.target.checked)}
                                        title={
                                          hasDownloadableFiles
                                            ? `${studentName} auswählen`
                                            : "Keine Dateien zum Herunterladen"
                                        }
                                        aria-label={`${studentName} auswählen`}
                                      />
                                    </td>

                                    <td className="submission-student-cell">
                                      <div className="submission-student-name" title={studentName}>
                                        {studentName}
                                      </div>
                                      {studentEmail ? (
                                        <div className="submission-student-email text-muted" title={studentEmail}>
                                          {studentEmail}
                                        </div>
                                      ) : null}
                                    </td>

                                    <td className="submission-time-cell">
                                      {submittedAtParts.date ? (
                                        <>
                                          <div className="submission-time-date">{submittedAtParts.date}</div>
                                          <div className="submission-time-clock">{submittedAtParts.time}</div>
                                        </>
                                      ) : (
                                        ""
                                      )}
                                    </td>

                                    <td className="submission-files-cell">
                                      {Array.isArray(s.files) && s.files.length > 0 ? (
                                        <>
                                          <ul className="submission-file-list">
                                            {s.files.map((f, idx) => {
                                              const href = getSubmissionFileUrl(f);
                                              const label = getSubmissionFileLabel(f);
                                              return (
                                                <li key={`${s.id}-f-${idx}`} className="submission-file-row">
                                                  {href ? (
                                                    <>
                                                      <a
                                                        href={href}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="submission-file-name text-decoration-none"
                                                        title={`Öffnen: ${label}`}
                                                      >
                                                        {label}
                                                      </a>
                                                      <a
                                                        href={href}
                                                        onClick={async (e) => {
                                                          e.preventDefault();
                                                          try {
                                                            const blob = await fetchFileBlob(href);
                                                            downloadBlob(blob, label);
                                                          } catch (err) {
                                                            console.error(err);
                                                            alert(t.downloadFailed || "Download fehlgeschlagen");
                                                          }
                                                        }}
                                                        title={`${t.download || "Herunterladen"}: ${label}`}
                                                        aria-label={`${t.download || "Herunterladen"}: ${label}`}
                                                        className="submission-file-download-btn"
                                                      >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                                          <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                                                          <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
                                                        </svg>
                                                      </a>
                                                    </>
                                                  ) : (
                                                    <span>{label}</span>
                                                  )}
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        </>
                                      ) : (
                                        "—"
                                      )}
                                    </td>

                                    <td className="submission-text-cell">
                                      <div className="submission-text-preview" title={s.text || ""}>
                                        {s.text && s.text.trim() !== "" ? s.text : "—"}
                                      </div>
                                    </td>
                                    <td className="submission-feedback-cell">
                                      <textarea
                                        className="form-control form-control-sm"
                                        rows={2}
                                        value={draft.feedback}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          setGradeDrafts((prev) => ({
                                            ...prev,
                                            [s.id]: {
                                              ...draft,
                                              feedback: v,
                                              feedbackError: "",
                                              feedbackOk: "",
                                            },
                                          }));
                                        }}
                                        placeholder={s.feedback || ""}
                                      />
                                      {draft.feedbackError ? (
                                        <div className="submission-grade-message text-danger">
                                          {draft.feedbackError}
                                        </div>
                                      ) : null}
                                      {draft.feedbackOk ? (
                                        <div className="submission-grade-message text-success">
                                          {draft.feedbackOk}
                                        </div>
                                      ) : null}
                                    </td>

                                    <td className="submission-grade-cell">
                                      <input
                                        className="form-control form-control-sm submission-grade-input"
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="1"
                                        value={draft.grade}
                                        onKeyDown={(e) => {
                                          if (["e", "E", "+", "-", ".", ","].includes(e.key)) {
                                            e.preventDefault();
                                          }
                                        }}
                                        onChange={(e) => {
                                          const rawValue = e.target.value;
                                          const v = rawValue === "" ? "" : rawValue.replace(/\D/g, "").slice(0, 3);
                                          setGradeDrafts((prev) => ({
                                            ...prev,
                                            [s.id]: {
                                              ...draft,
                                              grade: v,
                                              gradeError: "",
                                              gradeOk: "",
                                            },
                                          }));
                                        }}
                                        placeholder={
                                          typeof s.grade === "number" ? String(s.grade) : "100"
                                        }
                                      />
                                      {draft.gradeError ? (
                                        <div className="submission-grade-message text-danger">
                                          {draft.gradeError}
                                        </div>
                                      ) : null}
                                      {draft.gradeOk ? (
                                        <div className="submission-grade-message text-success">
                                          {draft.gradeOk}
                                        </div>
                                      ) : null}
                                    </td>

                                    <td className="submission-save-cell">
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
                        </>
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