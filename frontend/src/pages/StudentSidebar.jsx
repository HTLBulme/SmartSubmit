import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import { useState } from "react";
import "./StudentSidebar.css";

export default function StudentSidebar({ userData, activeView, onViewChange }) {
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
    
    return "ST";
  };

  const getUserName = (userData) => {
    const firstName = userData?.firstName || userData?.vorname || "";
    const lastName = userData?.lastName || userData?.nachname || "";
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    
    return userData?.email?.split("@")[0] || "Student";
  };

  const getUserClass = (userData) => {
    const assignments = userData?.assignments || [];
    if (assignments.length > 0) {
      return assignments[0]?.className || assignments[0]?.class?.name || "—";
    }
    return userData?.className || userData?.class?.name || "—";
  };

  // Simple menu - just 3 items
  const menuItems = [
    {
      id: "dashboard",
      icon: "🏠",
      label: t.dashboard || "Dashboard",
    },
    {
      id: "calendar",
      icon: "📅",
      label: t.calendar || "Calendar",
    },
    {
      id: "settings",
      icon: "⚙️",
      label: t.settings || "Settings",
    },
  ];

  const handleMenuClick = (itemId) => {
    onViewChange(itemId);
    setIsMobileOpen(false); // Close mobile menu
  };

  return (
    <>
      {/* Mobile toggle button - bottom right floating */}
      <button 
        className="sidebar-mobile-toggle"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle menu"
      >
        ☰
      </button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`student-sidebar ${isMobileOpen ? "mobile-open" : ""}`}>
        
        {/* Close button (mobile only) */}
        <button 
          className="sidebar-close-btn"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close menu"
        >
          ×
        </button>

       {/* Header */}
        <div className="sidebar-header">
        </div> 

        {/* User Profile */}
        <div className="sidebar-profile">
          <div className="sidebar-avatar">
            {getInitials(userData)}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{getUserName(userData)}</div>
            <div className="sidebar-user-role">{t.student} · {getUserClass(userData)}</div>
          </div>
        </div>

        {/* Navigation Menu - Simple, no submenus */}
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
