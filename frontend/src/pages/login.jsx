import React from "react";
import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
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
  const [useLdapToggle, setUseLdapToggle] = useState(false); // New state for LDAP toggle
  const location = useLocation();

  // Handle OAuth 2.0 login redirect
  useEffect(() => {
    // Extract the token and role from URL parameters after Google OAuth redirect
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const role = params.get('role') || localStorage.getItem("role") || "";
    const userParam = params.get('user');

    if (token) {
      // Save token to local and session storage
      localStorage.setItem('token', token);
      sessionStorage.setItem('token', token);
      
      if (userParam) {
        try {
          const userObj = JSON.parse(decodeURIComponent(userParam));
          localStorage.setItem('user', JSON.stringify(userObj));
        } catch (err) {
          console.error("Failed to parse user data from URL", err);
        }
      }

      if (role) {
        // Set active role and redirect user to the respective dashboard
        sessionStorage.setItem("activeRole", role);
        localStorage.setItem("role", role);
        if (role === "Admin") navigate("/admin");
        else if (role === "Teacher") navigate("/teacher");
        else if (role === "Student") navigate("/student");
      } else {
        // Fallback if role is empty (e.g. new Google user without assigned role)
        sessionStorage.setItem("activeRole", "Student");
        localStorage.setItem("role", "Student");
        navigate("/student");
      }
      
      // Clear token from the browser URL to keep it clean and secure
      window.history.replaceState({}, document.title, "/");
    }
  }, [location, navigate]);

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
      loginMethod: useLdapToggle ? 'ldap' : 'local' // Determine login method based on toggle
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

        {/* Google OAuth Login Button */}
        <button 
          type="button" 
          className="google-login-btn" 
          onClick={() => window.location.href = `${API_URL}/api/auth/google`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {t.loginWithGoogle || "Login with Google"}
        </button>

         {/* --- LDAP Toggle --- */}
        <button
          type="button"
          className="google-login-btn"
          onClick={() => setUseLdapToggle(!useLdapToggle)}
        >
          <p style={{ margin: 0, fontWeight: 500 }}>
            {t.loginWithLdap || "Login with school account (LDAP)"}
          </p>
        </button>

        <a className="forgot-link" href="#">
          {t.forgot}
        </a>

        {/* Help Link */}
        <div className="text-center mt-3">
          <Link to="/help" className="forgot-link">
            {t.help.helpBtn || "Help"} | {t.help.helpTitle || "Guide"}
          </Link>
        </div>

        {message && <p className="error-text">{message}</p>}
      </form>

    </div>
  );
}
