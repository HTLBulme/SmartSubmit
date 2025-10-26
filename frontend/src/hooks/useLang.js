import { useState, useEffect } from "react";

export function useLang() {
  const [lang, setLang] = useState(localStorage.getItem("lang") || "de");

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  return [lang, setLang];
}
