import { createContext, useContext, useState, useEffect } from "react";

const LangContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(localStorage.getItem("lang") || "de");

  useEffect(() => {
    localStorage.setItem("lang", lang);
    console.log("🌐 Sprache geändert (global):", lang);
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const { lang, setLang } = useContext(LangContext);
  return [lang, setLang];
}
