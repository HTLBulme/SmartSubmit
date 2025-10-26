import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import LanguageSwitcher from "../components/LanguageSwitcher";
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

    // Безопасно получаем имя роли
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

    // Всё ок → сохраняем
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

        <input
          type="password"
          placeholder={t.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

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
