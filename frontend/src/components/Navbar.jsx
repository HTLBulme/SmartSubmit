import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import "./Navbar.css";

export default function Navbar() {
  const [lang, setLang] = useLang();
  const t = T[lang];

  function toggleLang(newLang) {
    setLang(newLang);
    localStorage.setItem("lang", newLang);
  }

  function handleLogout() {
    localStorage.clear();
    window.location.href = "/";
  }

  return (
    <nav className="navbar">
      {/* === Логотип / Название === */}
      <div className="navbar-brand">
        Smart<span>Submit</span>
      </div>

      {/* === Правая часть: языки + выход === */}
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

        <button className="btn-logout" onClick={handleLogout}>
          {t.logout || "Logout"}
        </button>
      </div>
    </nav>
  );
}
