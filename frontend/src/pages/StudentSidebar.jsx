import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import { useState } from "react";
import "./StudentSidebar.css";

export default function StudentSidebar({ userData, activeView, onViewChange }) {
  const [lang] = useLang();
  const t = T[lang] || T.en;
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState("assignments");

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
    const assignment = userData?.assignments?.[0];
    return assignment?.className || userData?.className || "---";
  };

  // Count assignments by status
  const getAssignmentCounts = () => {
    const assignments = userData?.assignments || [];
    const now = new Date();
    
    let open = 0;
    let submitted = 0;
    let overdue = 0;
    
    assignments.forEach(assignment => {
      const dueDate = new Date(assignment.dueDate);
      if (assignment.submitted) {
        submitted++;
      } else if (dueDate < now) {
        overdue++;
      } else {
        open++;
      }
    });
    
    return { open, submitted, overdue, total: assignments.length };
  };

  const counts = getAssignmentCounts();

  const menuItems = [
    {
      id: "overview",
      icon: "",
      label: t.overview || "Overview",
      badge: null,
    },
    {
      id: "assignments",
      icon: "",
      label: t.myAssignments || "My Assignments",
      badge: counts.total,
      submenu: [
        { id: "open", label: t.open || "Open", badge: counts.open },
        { id: "submitted", label: t.submitted || "Submitted", badge: counts.submitted },
        { id: "overdue", label: t.overdue || "Overdue", badge: counts.overdue },
      ]
    },
    {
      id: "submissions",
      icon: "",
      label: t.mySubmissions || "My Submissions",
      badge: counts.submitted,
    },
    {
      id: "calendar",
      icon: "",
      label: t.calendar || "Calendar",
      badge: null,
    },
    {
      id: "settings",
      icon: "⚙️",
      label: t.settings || "Settings",
      badge: null,
    },
  ];

  const handleMenuClick = (itemId) => {
    const item = menuItems.find(m => m.id === itemId);
    if (item?.submenu) {
      setExpandedMenu(expandedMenu === itemId ? null : itemId);
    } else {
      onViewChange(itemId);
      setIsMobileOpen(false);
    }
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button 
        className="mobile-menu-btn"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle menu"
      >
        <span className="hamburger-icon">☰</span>
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
          className="mobile-close-btn"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close menu"
        >
          ×
        </button>

        {/* Header */}
        <div className="sidebar-header">
          <div className="app-logo">
            <span className="logo-icon">📱</span>
            <span className="logo-text">SmartSubmit</span>
          </div>
        </div>

        {/* User Profile */}
        <div className="sidebar-profile">
          <div className="profile-avatar">
            {getInitials(userData)}
          </div>
          <div className="profile-info">
            <div className="profile-name">{getUserName(userData)}</div>
            <div className="profile-role">{t.student} · {getUserClass(userData)}</div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <div key={item.id}>
              <button
                className={`nav-item ${activeView === item.id ? "active" : ""}`}
                onClick={() => handleMenuClick(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {item.badge !== null && item.badge > 0 && (
                  <span className="nav-badge">{item.badge}</span>
                )}
                {item.submenu && (
                  <span className="nav-arrow">
                    {expandedMenu === item.id ? "▼" : "▶"}
                  </span>
                )}
              </button>

              {/* Submenu */}
              {item.submenu && expandedMenu === item.id && (
                <div className="nav-submenu">
                  {item.submenu.map((subitem) => (
                    <button
                      key={subitem.id}
                      className={`nav-subitem ${activeView === subitem.id ? "active" : ""}`}
                      onClick={() => {
                        onViewChange(subitem.id);
                        setIsMobileOpen(false);
                      }}
                    >
                      <span className="nav-sublabel">{subitem.label}</span>
                      {subitem.badge !== null && subitem.badge > 0 && (
                        <span className="nav-subbadge">{subitem.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

      </aside>
    </>
  );
}
