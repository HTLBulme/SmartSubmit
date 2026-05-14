import { useLang } from "../context/LanguageContext";
import T from "../i18n";
import "./TeacherSettingsView.css";
import { useNavigate } from "react-router-dom";

export default function TeacherSettingsView({ userData }) {
  const [lang] = useLang();
  const t = T[lang] || T.en;
  const navigate = useNavigate();
  
  const handleChangePassword = () => {
    navigate("/change-password");
  };

  return (
    <div className="teacher-settings-view">
      <h2 className="settings-title">{t.settings || "Settings"}</h2>

      <div className="settings-section">
        <h3 className="settings-section-title">{t.accountSettings || "Account Settings"}</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">{t.firstName || "First Name"}</div>
          <div className="settings-item-value">
            {userData?.firstName || userData?.vorname || "—"}
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label">{t.lastName || "Last Name"}</div>
          <div className="settings-item-value">
            {userData?.lastName || userData?.nachname || "—"}
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label">{t.email || "Email"}</div>
          <div className="settings-item-value">
            {userData?.email || "—"}
          </div>
        </div>

        <div className="settings-item">
          <div className="settings-item-label">{t.subjectCode || "Subjects"}</div>
          <div className="settings-item-value">
            {userData?.subjectCode || userData?.subjects || "—"}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">{t.preferences || "Preferences"}</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">{t.language || "Language"}</div>
          <div className="settings-item-value">
            {lang === 'de' ? 'Deutsch' : 'English'}
          </div>
          <div className="settings-item-hint">
            {t.changeLanguageHint || "Change language in the top menu"}
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="settings-section-title">{t.security || "Security"}</h3>
        
        <div className="settings-item">
          <div className="settings-item-label">{t.password || "Password"}</div>
          <button className="settings-btn-secondary" onClick={handleChangePassword}>
            {t.changePassword || "Change Password"}
          </button>
          <div className="settings-item-hint">
            {t.passwordHintSettings || "Update your password regularly for security"}
          </div>
        </div>
      </div>

      <div className="settings-footer">
        <p className="settings-footer-text">
          {t.needHelp || "Need help?"} {t.contact || "Contact support"}
        </p>
      </div>
    </div>
  );
}
