import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import Navbar from "./components/Navbar";

// Lazy-loaded pages to optimize resources
const Login = lazy(() => import("./pages/login"));
const Register = lazy(() => import("./pages/register"));
const Admin = lazy(() => import("./pages/admin"));
const Teacher = lazy(() => import("./pages/teacher"));
const Student = lazy(() => import("./pages/student"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));//new
const Help = lazy(() => import("./pages/help"));

function RequireAuth({ children, allowedRoles }) {
  // DE: Token pro Tab (sessionStorage) bevorzugen, damit mehrere Accounts parallel funktionieren.
  // EN: Prefer per-tab token (sessionStorage) so multiple accounts can run in parallel.
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");
  // DE: Rolle pro Tab speichern (sessionStorage), damit Lehrer+Schüler parallel gehen.
  // EN: Store role per tab (sessionStorage) so teacher+student can run in parallel.
  const activeRole = sessionStorage.getItem("activeRole");
  const role = localStorage.getItem("role");

  let userRoles = [];
  try {
    const raw = localStorage.getItem("user");
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.roles)) {
      userRoles = parsed.roles
        .map((r) => (typeof r?.bezeichnung === "string" ? r.bezeichnung : null))
        .filter(Boolean);
    }
  } catch {
    userRoles = [];
  }

  if (!token) return <Navigate to="/" replace />;

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    // DE: Primär prüfen wir die pro-Tab Rolle.
    // EN: First check the per-tab role.
    if (activeRole && allowedRoles.includes(activeRole)) return children;

    // DE: Fallback: explizit gespeicherte Rolle.
    // EN: Fallback: explicitly stored role.
    if (role && allowedRoles.includes(role)) return children;

    // DE: Fallback: Rolle(n) aus gespeichertem user.roles verwenden.
    // EN: Fallback: use roles from stored user.roles.
    const hasAllowed = userRoles.some((r) => allowedRoles.includes(r));
    if (!hasAllowed) return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Router>
      <Navbar />
      <div className="main-content">
        <Suspense fallback={<div style={{ textAlign: "center", paddingTop: "40px" }}>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />

      <Route
        path="/admin"
        element={
          <RequireAuth allowedRoles={["Admin"]}>
            <Admin />
          </RequireAuth>
        }
      />
      <Route
        path="/teacher"
        element={
          <RequireAuth allowedRoles={["Lehrer"]}>
            <Teacher />
         </RequireAuth>
        }
      />
      <Route
       path="/student"
       element={
          <RequireAuth allowedRoles={["Schüler"]}>
            <Student />
         </RequireAuth>
       }
      />

      <Route 
       path="/change-password" 
       element={
         <RequireAuth allowedRoles={["Admin", "Lehrer", "Schüler"]}>
            <ChangePassword />
         </RequireAuth>
       } 
      />
      <Route path="/help" element={<Help />} />
      <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}
