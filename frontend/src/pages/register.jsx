import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import "./register.css";
import axios from "axios";
import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function Register() {
  const [lang] = useLang();
  const t = T[lang] || T.en;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [adminExists, setAdminExists] = useState(false);
  const [message, setMessage] = useState("");
  const hasChecked = useRef(false); //  To prevent multiple checks on re-render

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
        password,
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
      <div className="register-container">
        <div className="register-form">
          <h2>{t.adminTitle}</h2>
          <p className="error-text">⚠️ {t.regDisabled}</p>
          <a href="/" style={{
            display: "block",
            marginTop: "20px",
            textDecoration: "none",
            color: "white",
            background: "linear-gradient(135deg, #1d77e8, #1565c0)",
            padding: "0.8rem",
            borderRadius: "10px",
            width: "100%",
            boxSizing: "border-box"
          }}>
            {t.goToLogin || "➡️ Go to Login"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleRegister}>
        <h2>✳️ {t.adminTitle}</h2>
        <p>{t.adminSubtitle}</p>

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
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? (
              // --- eye-off icon ---
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M10.585 10.586A2 2 0 0012 14a2 2 0 001.414-3.414" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M9.88 5.515C10.57 5.35 11.277 5.25 12 5.25c5.523 0 9.75 4.5 9.75 6.75-.15.886-1.14 2.24-2.54 3.44M6.79 6.79C4.65 8.23 3 10.3 3 12c0 2.25 4.227 6.75 9.75 6.75 1.33 0 2.6-.22 3.77-.62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              // --- eye icon ---
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
            )}
          </button>
        </div>

        <button type="submit">
          {t.register}
        </button>

        <div className="text-center mt-3" style={{ marginTop: "15px" }}>
          <a href="/" className="forgot-link" style={{ textDecoration: "none" }}>
            {t.goToLogin || "Go to Login"}
          </a>
        </div>

        {message && <p className="error-text">{message}</p>}
      </form>
    </div>
  );
}
