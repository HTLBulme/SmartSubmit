import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import { useState } from "react";
import axios from "axios";
import "./login.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Login() {
  // 🔹 берём язык из контекста (а не из localStorage напрямую)
  const [lang] = useLang();
  const t = T[lang] || T.en;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

async function handleLogin(e) {
  e.preventDefault();
  setMessage("");

  try {
    const res = await axios.post(`${API_URL}/api/login`, {
      email,
      passwort: password,
      role,
    });

    console.log("🔍 SERVER RESPONSE:", res.data);

    const user = res.data.data?.user;
    const token = res.data.data?.token;

   // Sicherstellen, dass die Rolle korrekt extrahiert wird
   // безопасно получаем имя роли
    const actualRole =
      user?.role ||
      user?.rolle ||
      user?.roles?.[0]?.role ||
      user?.roles?.[0]?.name ||
      user?.roles?.[0]?.bezeichnung ||
      "";

    console.log("✅ EXTRACTED ROLE:", actualRole);

    // Проверка всех 3 параметров
    if (
      !user ||
      user.email.toLowerCase() !== email.toLowerCase() ||
      actualRole.toLowerCase() !== role.toLowerCase()
    ) {
      setMessage("❌ E-Mail, Passwort oder Rolle stimmen nicht überein");
      return;
    }

    // Sicherstellen, dass die Rolle korrekt extrahiert wird
    // безопасно сохраняем данные в localStorage
    localStorage.setItem("token", token);
    localStorage.setItem("role", actualRole);

    if (actualRole.toLowerCase() === "admin") window.location.href = "/admin";
    else if (actualRole.toLowerCase() === "lehrer") window.location.href = "/teacher";
    else window.location.href = "/student";

    setMessage("✅ Login erfolgreich!");
  } catch (err) {
    console.error("⚠️ Login Fehler:", err);
    setMessage("⚠️ Serverfehler beim Login");
  }
}


  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>

        <h2>🔐 {t.title}</h2>
        <p>{t.subtitle}</p>

        <input
          type="email"
          placeholder={t.email}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            placeholder={t.password}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              // eye-off icon
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M10.585 10.586A2 2 0 0012 14a2 2 0 001.414-3.414" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M9.88 5.515C10.57 5.35 11.277 5.25 12 5.25c5.523 0 9.75 4.5 9.75 6.75-.15.886-1.14 2.24-2.54 3.44M6.79 6.79C4.65 8.23 3 10.3 3 12c0 2.25 4.227 6.75 9.75 6.75 1.33 0 2.6-.22 3.77-.62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              // eye icon
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )}
          </button>
        </div>

        <select value={role} onChange={(e) => setRole(e.target.value)} required>
          <option value="">{t.selectRole}</option>
          <option value="Admin">{t.admin}</option>
          <option value="Lehrer">{t.teacher}</option>
          <option value="Schüler">{t.student}</option>
        </select>

        <button type="submit">{t.login}</button>

        <a className="forgot-link" href="#">
          {t.forgot}
        </a>

        {message && <p className="error-text">{message}</p>}
      </form>
    </div>
  );
}
