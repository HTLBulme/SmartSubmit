
import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import { useNavigate } from "react-router-dom";
import { Link } from 'react-router-dom';
import "./Navbar.css";

export default function Navbar() {
  const [lang, setLang] = useLang();
  const t = T[lang];

  const navigate = useNavigate();

  function toggleLang(newLang) {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
  }

  function handleLogout() {
    localStorage.clear();
    navigate("/");
  }

   function handleChangePassword() {
    window.location.href = "/change-password";//new 
  }

  
  const isLoggedIn = localStorage.getItem("token");//new

  return (
    <nav className="navbar">
      {/* === Логотип / Название === */}
      <div className="navbar-brand">
        Smart<span>Submit</span>
      </div>

      {/* === Правая часть: языки +pw ädern+ выход === */}
      <div className="navbar-right">
        <div className="lang-switcher">
          <button
            className={lang === "de" ? "active" : ""}
            onClick={() => toggleLang("de")}
          >
            DE
          </button>
          <button
            className={lang === "en" ? "active" : ""}
            onClick={() => toggleLang("en")}
          >
            EN
          </button>
        </div>

        {/* new pw ädern Button (nur nach einloggen) */}
        {isLoggedIn && (
          <button className="btn-logout" onClick={handleChangePassword}>
            {t.changePassword || "Passwort ändern"}
          </button>
        )}
        
        <button className="btn-logout" onClick={handleLogout}>
          {t.logout || "Logout"}
        </button>

          {/* Add Help Button */}
        <Link to="/help" className="btn btn-sm btn-outline-light me-2">
          <i className="bi bi-question-circle"></i> {t.helpBtn}
        </Link>
      </div>
    </nav>
  );
}
