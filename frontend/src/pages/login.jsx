import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Link } from 'react-router-dom'; 
import "./login.css";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function Login() {
  const [lang] = useLang();
  const t = T[lang] || T.en;

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requestedRole, setRequestedRole] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

async function handleLogin(e) {
  e.preventDefault();
  setMessage("");

  try {
    // --- Check if there's an existing token and user info in localStorage that matches the requested role. ---
    const existingToken = localStorage.getItem("token");
    const existingUserRaw = localStorage.getItem("user");
    let existingUser = null;
    try {
      existingUser = existingUserRaw ? JSON.parse(existingUserRaw) : null;
    } catch {
      existingUser = null;
    }

    if (existingToken && existingUser && Array.isArray(existingUser.userRoles) && requestedRole) {
      const hasRole = existingUser.userRoles.some(
        (r) => typeof r?.name === "string" && r.name.toLowerCase() === requestedRole.toLowerCase()
      );
      if (hasRole) {
        sessionStorage.setItem("token", existingToken);
        sessionStorage.setItem("activeRole", requestedRole);
        // --- Keep for backwards compatibility ---
        localStorage.setItem("role", requestedRole);

        if (requestedRole === "Admin") navigate("/admin");
        else if (requestedRole === "Teacher") navigate("/teacher");
        else if (requestedRole === "Student") navigate("/student");
        return;
      }
    }

    const res = await axios.post(`${API_URL}/api/login`, {
      email,
      password: password,
      role: requestedRole.trim(), // Ensure no extra spaces in role
    });

    const { token, user } = res.data.data;

    localStorage.setItem("token", token);
    // --- Store role per tab (sessionStorage) so teacher+student can run in parallel. ---
    sessionStorage.setItem("token", token);
    sessionStorage.setItem("activeRole", requestedRole);
    // --- Keep for backwards compatibility ---
    localStorage.setItem("role", requestedRole);
    if (user) localStorage.setItem("user", JSON.stringify(user));

    if (requestedRole === "Admin") navigate("/admin");
    else if (requestedRole === "Teacher") navigate("/teacher");
    else if (requestedRole === "Student") navigate("/student");

  } catch (err) {
    const status = err?.response?.status;
    const backendMessage = err?.response?.data?.message;
    console.error("Login Error:", status, backendMessage, err);
    setMessage(
      backendMessage ||
        "❌ Email, password, or role do not match."
    );
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

        <select
          value={requestedRole}
          onChange={(e) => setRequestedRole(e.target.value)}
          required
        >
          <option value="">{t.selectRole}</option>
          <option value="Admin">{t.admin}</option>
          <option value="Teacher">{t.teacher}</option>
          <option value="Student">{t.student}</option>
        </select>


        <button type="submit">{t.login}</button>

        <a className="forgot-link" href="#">
          {t.forgot}
        </a>

        {/* Help Link */}
        <div className="text-center mt-3">
          <Link to="/help" className="text-muted">
            {t.helpBtn || "Help"} | {t.helpTitle || "Guide"}
          </Link>
        </div>

        {message && <p className="error-text">{message}</p>}
      </form>

    </div>
  );
}
