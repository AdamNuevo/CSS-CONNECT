import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import Icon from "./Icon.jsx";
import Avatar from "./Avatar.jsx";
import { useAuth } from "../auth.jsx";

const DEAN_NAV = [
  { label: "Dashboard",     to: "/dean/dashboard",     icon: "home",         end: true },
  { label: "Students",      to: "/dean/students",      icon: "user" },
  { label: "Faculty",       to: "/dean/faculty",       icon: "users" },
  { label: "Schedules",     to: "/dean/schedules",     icon: "calendar" },
  { label: "Consultations", to: "/dean/consultations", icon: "message-square" },
  { label: "Evaluations",   to: "/dean/evaluations",   icon: "star" },
  { label: "Announcements", to: "/dean/announcements", icon: "bell" },
  { label: "Approvals",     to: "/dean/approvals",     icon: "check-square" },
  { label: "Organizations", to: "/dean/organizations", icon: "briefcase" },
  { label: "Research",      to: "/dean/research",      icon: "book-open" },
  { label: "Reports",       to: "/dean/reports",       icon: "bar-chart" },
  { label: "Access",        to: "/dean/access",        icon: "shield" },
];

const DEAN_TITLES = {
  "/dean/dashboard":     "Dashboard",
  "/dean/students":      "Students",
  "/dean/faculty":       "Faculty",
  "/dean/schedules":     "Schedules",
  "/dean/consultations": "Consultations",
  "/dean/evaluations":   "Faculty evaluations",
  "/dean/announcements": "Announcements",
  "/dean/approvals":     "Approvals",
  "/dean/organizations": "Organizations",
  "/dean/research":      "Research and capstone",
  "/dean/reports":       "Reports",
  "/dean/access":        "Access",
  "/dean/profile":       "Your profile",
};

function DeanSidebar({ open, onClose }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  return (
    <aside className={"sidebar" + (open ? " open" : "")} aria-label="Sidebar">
      <Link className="brand" to="/dean/dashboard" aria-label="CCS Hub home">
        <img className="brand-logo" src="/qcu-logo.png" alt="" width="40" height="40" />
        <span>
          <span className="brand-name">CCS Hub</span>
          <span className="brand-sub">Quezon City University</span>
        </span>
      </Link>

      <nav className="nav" aria-label="Main">
        <div className="nav-group">
          {DEAN_NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={onClose}
              className={({ isActive }) => (isActive ? "active" : "")}
            >
              <Icon name={n.icon} />
              {n.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <Link className="sidebar-user" to="/dean/profile" onClick={onClose} aria-label="Your profile">
        <Avatar name={user.name} photo={user.photo} />
        <span className="sidebar-user-text"><strong>{user.name}</strong><small>{user.role}</small></span>
      </Link>
    </aside>
  );
}

function DeanTopbar({ onMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const onStudentsOrFaculty = pathname === "/dean/students" || pathname === "/dean/faculty";
  const [local, setLocal] = useState("");
  const value = onStudentsOrFaculty ? params.get("q") || "" : local;
  const input = useRef();

  // Press "/" anywhere to jump to search
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && !["INPUT", "SELECT", "TEXTAREA"].includes(tag)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const onChange = (e) => {
    const v = e.target.value;
    if (onStudentsOrFaculty) setParams(v ? { q: v } : {}, { replace: true });
    else setLocal(v);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !onStudentsOrFaculty) {
      navigate("/dean/students?q=" + encodeURIComponent(local.trim()));
    }
  };

  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
      <h1>{DEAN_TITLES[pathname] || ""}</h1>
      <div className="topbar-right">
        <label className="search">
          <Icon name="search" />
          <input
            ref={input}
            type="search"
            placeholder="Search students, faculty, research"
            aria-label="Search students, faculty, research"
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
        <Avatar as={Link} to="/dean/profile" aria-label="Your profile" name={user.name} photo={user.photo} />
      </div>
    </header>
  );
}

export default function DeanLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Close mobile menu after navigating, and scroll to top of new page
  useEffect(() => { setMenuOpen(false); window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="app">
      <a className="skip-link" href="#content">Skip to content</a>
      <DeanSidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <div className="main">
        <DeanTopbar onMenu={() => setMenuOpen(true)} />
        <main className="content" id="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
