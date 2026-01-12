import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Suspense, lazy } from "react";
import Navbar from "./components/Navbar";

// Lazy-loaded pages to optimize resources
const Login = lazy(() => import("./pages/login"));
const Register = lazy(() => import("./pages/register"));
const Admin = lazy(() => import("./pages/admin"));
const Teacher = lazy(() => import("./pages/teacher"));
const Student = lazy(() => import("./pages/student"));

function RequireAuth({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) return <Navigate to="/" replace />;
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
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
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}
