import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./login.css";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function ChangePassword() {
  const [lang] = useLang();
  const t = T[lang] || T.en;
  const navigate = useNavigate();

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    // Validate password length
    if (newPassword.length < 6) {
      setMessage(t.passwordTooShort);
      return;
    }

    // Check password match
    if (newPassword !== confirmPassword) {
      setMessage(t.passwordMismatch);
      return;
    }
    /*
    // New password must not be the same as the old one
    if (oldPassword === newPassword) {
      setMessage(t.samePassword);
      return;
    }
      */

    setIsLoading(true);

    try {
      const token = localStorage.getItem("token");
      
      if (!token) {
        setMessage(t.notLoggedIn);
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      const res = await axios.post(
        `${API_URL}/api/change-password`,
        {
          oldPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setIsSuccess(true);
      setMessage(res.data.message || t.passwordChangeSuccess);

      // Automatically redirect to home page after 3 seconds
      setTimeout(() => {
        const role = localStorage.getItem("role");
        if (role?.toLowerCase() === "admin") navigate("/admin");
        else if (role?.toLowerCase() === "lehrer") navigate("/teacher");
        else navigate("/student");
      }, 3000);
    } catch (err) {
      console.error("⚠️ Change password error:", err);
      setIsSuccess(false);
      
      if (err.response?.status === 401) {
        setMessage(t.wrongOldPassword);
      } else if (err.response?.status === 403) {
        setMessage(t.notLoggedIn);
      } else {
        setMessage(t.serverError);
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Eye icon SVG component
  const EyeIcon = ({ show }) => (
    show ? (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M10.585 10.586A2 2 0 0012 14a2 2 0 001.414-3.414" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M9.88 5.515C10.57 5.35 11.277 5.25 12 5.25c5.523 0 9.75 4.5 9.75 6.75-.15.886-1.14 2.24-2.54 3.44M6.79 6.79C4.65 8.23 3 10.3 3 12c0 2.25 4.227 6.75 9.75 6.75 1.33 0 2.6-.22 3.77-.62" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      </svg>
    )
  );

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>🔐 {t.changePasswordTitle}</h2>
        <p>{t.changePasswordSubtitle}</p>

        {!isSuccess ? (
          <>
            {/* Old password */}
            <div className="password-field">
              <input
                type={showOldPassword ? "text" : "password"}
                placeholder={t.oldPassword}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowOldPassword((v) => !v)}
                aria-label={showOldPassword ? "Passwort verbergen" : "Passwort anzeigen"}
              >
                <EyeIcon show={showOldPassword} />
              </button>
            </div>

            {/* New password */}
            <div className="password-field">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder={t.newPassword}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowNewPassword((v) => !v)}
                aria-label={showNewPassword ? "Passwort verbergen" : "Passwort anzeigen"}
              >
                <EyeIcon show={showNewPassword} />
              </button>
            </div>

            {/* Confirm new password */}
            <div className="password-field">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder={t.confirmPassword}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? "Passwort verbergen" : "Passwort anzeigen"}
              >
                <EyeIcon show={showConfirmPassword} />
              </button>
            </div>

            <button type="submit" disabled={isLoading}>
              {isLoading ? t.loading : t.changePassword}
            </button>

            <a 
              className="forgot-link" 
              onClick={() => navigate(-1)}
              style={{ cursor: "pointer" }}
            >
              {t.cancel}
            </a>
          </>
        ) : (
          <div className="success-message">
            <p>✅ {message}</p>
            <p style={{ fontSize: "0.9em", color: "#666", marginTop: "10px" }}>
              {t.redirecting}
            </p>
          </div>
        )}

        {message && !isSuccess && (
          <p className="error-text">{message}</p>
        )}
      </form>
    </div>
  );
}