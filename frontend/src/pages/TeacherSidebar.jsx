import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import { useState } from "react";
import "./TeacherSidebar.css";

export default function TeacherSidebar({ userData, activeView, onViewChange }) {
  const [lang] = useLang();
  const t = T[lang] || T.en;
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const getInitials = (userData) => {
    const firstName = userData?.firstName || userData?.vorname || "";
    const lastName = userData?.lastName || userData?.nachname || "";
    
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    
    const email = userData?.email || "";
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    
    return "TE";
  };

  const getUserName = (userData) => {
    const firstName = userData?.firstName || userData?.vorname || "";
    const lastName = userData?.lastName || userData?.nachname || "";
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    
    return userData?.email?.split("@")[0] || "Teacher";
  };

  const getSubjects = (userData) => {
    const subjects = userData?.subjects || userData?.subjectCode || "";
    if (typeof subjects === 'string' && subjects) {
      return subjects.split(',').map(s => s.trim()).join(', ');
    }
    return "—";
  };

  // Simple menu - only 2 items (no Assignments List)
  const menuItems = [
    {
      id: "dashboard",
      icon: "🏠",
      label: t.createAssignment || "Create Assignment",
    },
    {
      id: "settings",
      icon: "⚙️",
      label: t.settings || "Settings",
    },
  ];

  const handleMenuClick = (itemId) => {
    onViewChange(itemId);
    setIsMobileOpen(false);
  };

  return (
    <>
      <button 
        className="sidebar-mobile-toggle"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      {isMobileOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      <aside className={`teacher-sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
        
        <button 
          className="sidebar-close-btn"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close menu"
        >
          ×
        </button>

        <div className="sidebar-header">
        </div>

        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {getInitials(userData)}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{getUserName(userData)}</div>
            <div className="sidebar-user-role">{t.teacher} · {getSubjects(userData)}</div>
          </div>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className={`sidebar-menu-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => handleMenuClick(item.id)}
            >
              <span className="sidebar-menu-icon">{item.icon}</span>
              <span className="sidebar-menu-label">{item.label}</span>
            </button>
          ))}
        </nav>

      </aside>
    </>
  );
}