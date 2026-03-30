import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import { useNavigate, Link } from "react-router-dom";
import "./Navbar.css";

export default function Navbar() {
  const [lang, setLang] = useLang();
  const t = T[lang] || T.en;
  const navigate = useNavigate();

  function toggleLang(newLang) {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
  }

  function handleLogout() {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  }

  function handleChangePassword() {
    navigate("/change-password");
  }

  const isLoggedIn = localStorage.getItem("token") || sessionStorage.getItem("token");

  return (
    <nav className="app-main-navbar">
      {/* Brand/Logo */}
      <div className="app-navbar-brand">
        Smart<span>Submit</span>
      </div>

      {/* Right section: languages + buttons */}
      <div className="app-navbar-right">
        {/* Language switcher */}
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

        {/* Show these buttons only when logged in */}
        {isLoggedIn && (
          <>
            {/* Change Password button */}
            <button className="app-nav-btn" onClick={handleChangePassword}>
              {t.changePassword || "Change Password"}
            </button>

            {/* Help button */}
            <Link to="/help" className="app-nav-btn">
              {t.helpBtn || "Help"}
            </Link>
          </>
        )}

        {/* Logout button */}
        <button className="app-nav-logout" onClick={handleLogout}>
          {t.logout || "Logout"}
        </button>
      </div>
    </nav>
  );
}
