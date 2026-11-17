import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import DeanLayout from "./components/DeanLayout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ImportPage from "./pages/ImportPage.jsx";
import Review from "./pages/Review.jsx";
import People from "./pages/People.jsx";
import AddPerson from "./pages/AddPerson.jsx";
import Profile from "./pages/Profile.jsx";
import Activity from "./pages/Activity.jsx";
import DeanDashboard from "./pages/dean/DeanDashboard.jsx";
import DeanStudents from "./pages/dean/DeanStudents.jsx";
import DeanFaculty from "./pages/dean/DeanFaculty.jsx";
import DeanSchedules from "./pages/dean/DeanSchedules.jsx";
import DeanConsultations from "./pages/dean/DeanConsultations.jsx";
import DeanEvaluations from "./pages/dean/DeanEvaluations.jsx";
import DeanAnnouncements from "./pages/dean/DeanAnnouncements.jsx";
import DeanApprovals from "./pages/dean/DeanApprovals.jsx";
import DeanOrganizations from "./pages/dean/DeanOrganizations.jsx";
import DeanResearch from "./pages/dean/DeanResearch.jsx";
import DeanReports from "./pages/dean/DeanReports.jsx";
import DeanAccess from "./pages/dean/DeanAccess.jsx";
import { useAuth } from "./auth.jsx";

// Require user to be a Registrar; if Dean, redirect to Dean portal
function RequireRegistrar({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "Dean") return <Navigate to="/dean/dashboard" replace />;
  if (user.role !== "Registrar") return <Navigate to="/login" replace />;
  return children;
}

// Require user to be a Dean; if Registrar, redirect to Registrar portal
function RequireDean({ children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "Registrar") return <Navigate to="/" replace />;
  if (user.role !== "Dean") return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user, loading } = useAuth();

  // Wait until we know whether the browser already has a session
  if (loading) return <div className="splash" role="status">Loading…</div>;

  return (
    <Routes>
      {/* /login redirects according to role if already signed in */}
      <Route
        path="/login"
        element={
          user ? (
            user.role === "Dean" ? (
              <Navigate to="/dean/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          ) : (
            <Login />
          )
        }
      />

      {/* Registrar Portal routes — wrapped in Layout */}
      <Route
        path="/"
        element={
          !user ? (
            <Navigate to="/login" replace />
          ) : user.role === "Dean" ? (
            <Navigate to="/dean/dashboard" replace />
          ) : (
            <RequireRegistrar>
              <Layout />
            </RequireRegistrar>
          )
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="review" element={<Review />} />
        <Route path="students" element={<People kind="students" />} />
        <Route path="faculty" element={<People kind="faculty" />} />
        <Route path="add" element={<AddPerson />} />
        <Route path="activity" element={<Activity />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Dean Portal routes — wrapped in DeanLayout */}
      <Route
        path="/dean"
        element={
          <RequireDean>
            <DeanLayout />
          </RequireDean>
        }
      >
        <Route index element={<Navigate to="/dean/dashboard" replace />} />
        <Route path="dashboard" element={<DeanDashboard />} />
        <Route path="students" element={<DeanStudents />} />
        <Route path="faculty" element={<DeanFaculty />} />
        <Route path="schedules" element={<DeanSchedules />} />
        <Route path="consultations" element={<DeanConsultations />} />
        <Route path="evaluations" element={<DeanEvaluations />} />
        <Route path="announcements" element={<DeanAnnouncements />} />
        <Route path="approvals" element={<DeanApprovals />} />
        <Route path="organizations" element={<DeanOrganizations />} />
        <Route path="research" element={<DeanResearch />} />
        <Route path="reports" element={<DeanReports />} />
        <Route path="access" element={<DeanAccess />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Catch-all */}
      <Route
        path="*"
        element={
          user ? (
            user.role === "Dean" ? (
              <Navigate to="/dean/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}
