import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import Navbar from "./components/Navbar";

// Lazy-loaded pages to optimize resources
const Login = lazy(() => import("./pages/login"));
const Register = lazy(() => import("./pages/register"));
const Admin = lazy(() => import("./pages/admin"));
const Teacher = lazy(() => import("./pages/teacher"));
const Student = lazy(() => import("./pages/student"));
const ChangePassword = lazy(() => import("./pages/ChangePassword"));//new

export default function App() {
  return (
    <Router>
      <Navbar />
      <div className="main-content">
        <Suspense fallback={<div style={{ textAlign: "center", paddingTop: "40px" }}>Loading...</div>}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/teacher" element={<Teacher />} />
            <Route path="/student" element={<Student />} />
            <Route path="/change-password" element={<ChangePassword />} />{/* new */}
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}
