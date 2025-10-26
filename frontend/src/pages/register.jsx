import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import LanguageSwitcher from "../components/LanguageSwitcher";
import "./register.css";
import axios from "axios";
import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export default function Register() {
  const [lang] = useLang();
  if (!lang) return null;
  const t = T[lang];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adminExists, setAdminExists] = useState(false);
  const [message, setMessage] = useState("");
  const hasChecked = useRef(false); // ✅ флаг

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      const res = await axios.get(`${API_URL}/api/admin/check`);
      setAdminExists(res.data.adminExists);
    } catch (err) {
      console.error("checkAdmin error:", err);
      setMessage(T[lang]?.serverError || "Server error");
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setMessage("");

    try {
      const res = await axios.post(`${API_URL}/api/register`, {
        email,
        password, // ✅ исправлено
        roleId: 3,
      });

      if (res.data.success) {
        setMessage("✅ " + t.registerSuccess);
        setTimeout(() => (window.location.href = "./"), 1500);
      } else {
        setMessage(res.data.message || t.registerFail);
      }
    } catch {
      setMessage(T[lang]?.serverError || "Server error");
    }
  }

  if (adminExists) {
    return (
      <div className="form-page">
        <div className="form-card">
          <h2>{t.adminTitle}</h2>
          <p className="error-text">⚠️ {t.regDisabled}</p>
          <a href="/" className="btn-primary">
            {t.goToLogin || "➡️ Go to Login"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="register-card">
      <form className="form-card" onSubmit={handleRegister}>
        <h2>✳️ {t.adminTitle}</h2>
        <p className="subtitle">{t.adminSubtitle}</p>

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
        <button type="submit" className="btn-primary">
          {t.register}
        </button>
        {message && <p className="error-text">{message}</p>}
      </form>
    </div>
  );
}
