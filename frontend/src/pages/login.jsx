import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import {
  ROLE_PATHS,
  clearAuthenticatedIdentity,
  resolvePostAuth,
  storeActiveRole,
  storeAuthenticatedIdentity,
} from "../auth/session";
import "./login.css";

const API_URL = import.meta.env.VITE_API_URL || "";

export default function Login() {
  const [lang] = useLang();
  const t = T[lang] || T.en;
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [useLdap, setUseLdap] = useState(false);
  const [pendingRoles, setPendingRoles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirmAndOpenRole = useCallback(async (role, token, assignedRoles) => {
    if (!assignedRoles.includes(role)) {
      setMessage(t.roleError);
      return;
    }

    await axios.post(
      `${API_URL}/api/auth/select-role`,
      { role },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    storeActiveRole(role);
    navigate(ROLE_PATHS[role], { replace: true });
  }, [navigate, t.roleError]);

  const continueAfterAuthentication = useCallback(async (token, user) => {
    if (!token || !user) {
      clearAuthenticatedIdentity();
      setMessage(t.loginFailed);
      return;
    }

    storeAuthenticatedIdentity(token, user);
    const next = resolvePostAuth(user);

    if (next.kind === "none") {
      clearAuthenticatedIdentity();
      setMessage(t.noAssignedRole);
      return;
    }

    if (next.kind === "multiple") {
      setPendingRoles(next.roles);
      return;
    }

    try {
      await confirmAndOpenRole(next.role, token, next.roles);
    } catch (error) {
      console.error("Role validation failed:", error);
      clearAuthenticatedIdentity();
      setMessage(t.roleSelectionFailed);
    }
  }, [confirmAndOpenRole, t.loginFailed, t.noAssignedRole, t.roleSelectionFailed]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const oauthError = params.get("error");
    const token = params.get("token");
    const userParam = params.get("user");

    if (oauthError) {
      setMessage(t.oauthFailed);
      window.history.replaceState({}, document.title, "/");
      return;
    }

    if (!token) return;

    window.history.replaceState({}, document.title, "/");
    try {
      const user = JSON.parse(userParam || "null");
      void continueAfterAuthentication(token, user);
    } catch (error) {
      console.error("Failed to parse OAuth user data:", error);
      clearAuthenticatedIdentity();
      setMessage(t.loginFailed);
    }
  }, [continueAfterAuthentication, location.search, t.loginFailed, t.oauthFailed]);

  async function handleLogin(event) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      const credentials = useLdap
        ? { identifier: email, password, loginMethod: "ldap" }
        : { email, password, loginMethod: "local" };
      const response = await axios.post(`${API_URL}/api/login`, credentials);
      const { token, user } = response.data.data;
      await continueAfterAuthentication(token, user);
    } catch (error) {
      const backendMessage = error?.response?.data?.message;
      console.error("Login error:", error?.response?.status, backendMessage, error);
      clearAuthenticatedIdentity();
      setMessage(backendMessage || t.loginFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRoleSelection(role) {
    const token = sessionStorage.getItem("token") || localStorage.getItem("token");
    setMessage("");
    setIsSubmitting(true);
    try {
      await confirmAndOpenRole(role, token, pendingRoles);
    } catch (error) {
      console.error("Role validation failed:", error);
      setMessage(t.roleSelectionFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  function cancelRoleSelection() {
    clearAuthenticatedIdentity();
    setPendingRoles([]);
    setMessage("");
  }

  if (pendingRoles.length > 1) {
    return (
      <div className="login-container">
        <section className="login-form role-selection" aria-labelledby="role-selection-title">
          <h2 id="role-selection-title">{t.chooseRoleTitle}</h2>
          <p>{t.chooseRoleSubtitle}</p>
          <div className="role-options">
            {pendingRoles.map((role) => (
              <button
                key={role}
                type="button"
                className="role-option"
                disabled={isSubmitting}
                onClick={() => handleRoleSelection(role)}
              >
                {t[role.toLowerCase()] || role}
              </button>
            ))}
          </div>
          <button type="button" className="role-cancel" onClick={cancelRoleSelection}>
            {t.cancel}
          </button>
          {message && <p className="error-text" role="alert">{message}</p>}
        </section>
      </div>
    );
  }

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleLogin}>
        <h2>🔐 {t.title}</h2>
        <p>{t.subtitle}</p>

        <input
          type={useLdap ? "text" : "email"}
          placeholder={useLdap ? t.ldapUsername : t.email}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="username"
          required
        />

        <div className="password-field">
          <input
            type={showPassword ? "text" : "password"}
            placeholder={t.password}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? t.hidePassword : t.showPassword}
            aria-pressed={showPassword}
          >
            {showPassword ? "◉" : "○"}
          </button>
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? t.loading : t.login}
        </button>

        <button
          type="button"
          className="google-login-btn"
          onClick={() => { window.location.href = `${API_URL}/api/auth/google`; }}
        >
          <span className="google-mark" aria-hidden="true">G</span>
          {t.loginWithGoogle}
        </button>

        <button
          type="button"
          className={`google-login-btn${useLdap ? " auth-method-active" : ""}`}
          onClick={() => setUseLdap((value) => !value)}
          aria-pressed={useLdap}
        >
          {useLdap ? t.useLocalLogin : t.loginWithLdap}
        </button>

        <a className="forgot-link" href="#">{t.forgot}</a>
        <div className="text-center mt-3">
          <Link to="/help" className="forgot-link">
            {t.help.helpBtn} | {t.help.helpTitle}
          </Link>
        </div>
        {message && <p className="error-text" role="alert">{message}</p>}
      </form>
    </div>
  );
}
