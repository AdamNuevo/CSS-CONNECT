import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import ImportPage from "./pages/ImportPage.jsx";
import Review from "./pages/Review.jsx";
import People from "./pages/People.jsx";
import AddPerson from "./pages/AddPerson.jsx";
import Profile from "./pages/Profile.jsx";
import { useAuth } from "./auth.jsx";

// Everything except /login needs a signed-in user.
function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { user, loading } = useAuth();

  // wait until we know whether the browser already has a session
  if (loading) return <div className="splash" role="status">Loading…</div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/review" element={<Review />} />
        <Route path="/students" element={<People kind="students" />} />
        <Route path="/faculty" element={<People kind="faculty" />} />
        <Route path="/add" element={<AddPerson />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
