import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import { useState, useEffect } from "react";
import axios from "axios";
import "./student.css";

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

  const vorname = storedUser?.vorname ?? userData?.vorname;
  const nachname = storedUser?.nachname ?? userData?.nachname;
  const email = storedUser?.email ?? userData?.email;

  const fullName = [vorname, nachname].filter(Boolean).join(" ");
  if (fullName.trim()) return titleCaseWords(fullName);

  if (userData?.name) return titleCaseWords(userData.name);

  if (typeof email === "string" && email.includes("@")) {
    return titleCaseWords(email.split("@")[0].replace(/[._-]+/g, " "));
  }

  return "Student";
}

export default function StudentDashboard() {
  const [lang] = useLang();
  const t = T[lang] || T.en;
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(`${API_URL}/api/student/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserData(response.data);
      } catch (err) {
        setError(t.fetchError || "Error loading student data");
        console.error("Error fetching student data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [t]);

  /* Local-backend
  useEffect(() => {
    // Mockdaten
    const mockData = {
      name: "Max Mustermann",
      assignments: [
        {
          id: 1,
          title: "Mathe-Hausaufgabe",
          dueDate: "2025-12-01",
          submitted: true
        },
        {
          id: 2,
          title: "Programmierprojekt",
          dueDate: "2025-12-15",
          submitted: false
        }
      ],
      grades: [
        {
          id: 1,
          assignmentTitle: "Klassenarbeit",
          grade: "1",
          feedback: "Ausgezeichnete Arbeit!"
        }
      ]
    };

    setUserData(mockData);
    setLoading(false);
  }, []); // Einmalig beim Laden, da es sich um Mockdaten handelt
*/
  if (loading) {
    return <div className="loading">{t.loading || "Loading..."}</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="student-dashboard">
      <header className="dashboard-header">
        <h1>
          {(t.welcome || "Welcome").trim()} {getFriendlyName(userData)}
        </h1>
      </header>

      <div className="dashboard-content">
        <div className="assignments">
          <h2>{t.myAssignments}</h2>
          <div className="assignments-list">
            {userData?.assignments?.map((assignment) => (
              <div key={assignment.id} className="assignment-item">
                <div className="assignment-info">
                  <div className="assignment-title">{assignment.title}</div>
                  <div className="assignment-due">
                    {t.dueDate}: {new Date(assignment.dueDate).toLocaleDateString()}
                  </div>
                </div>
                <span
                  className={`assignment-status ${
                    assignment.submitted
                      ? "status-submitted"
                      : "status-not-submitted"
                  }`}
                >
                  {assignment.submitted ? t.submitted : t.notSubmitted}
                </span>
                <button className="view-details-btn">{t.viewDetails}</button>
              </div>
            ))}
          </div>
        </div>

        <section className="grades">
          <h2>{t.myGrades || "My Grades"}</h2>
          {userData?.grades?.length > 0 ? (
            <div className="grades-list">
              {userData.grades.map((grade) => (
                <div key={grade.id} className="grade-item">
                  <h3>{grade.assignmentTitle}</h3>
                  <p>
                    <strong>{t.grade}:</strong> {grade.grade}
                  </p>
                  {grade.feedback && (
                    <p>
                      <strong>{t.feedback}:</strong> {grade.feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>{t.noGrades}</p>
          )}
        </section>
      </div>
        </div>
        )}