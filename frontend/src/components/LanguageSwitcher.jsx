import { useLang } from "../context/LanguageContext";
export default function LanguageSwitcher() {
  const [lang, setLang] = useLang();
  return (
    <div className="lang-switcher">
      <button
        onClick={() => setLang("de")}
        className={lang === "de" ? "active" : ""}
      >
        DE
      </button>
      <button
        onClick={() => setLang("en")}
        className={lang === "en" ? "active" : ""}
      >
        EN
      </button>
    </div>
  );
}
