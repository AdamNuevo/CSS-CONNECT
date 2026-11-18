import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import Icon from "./Icon.jsx";
import Avatar from "./Avatar.jsx";
import { useAuth } from "../auth.jsx";

const NAV = [
  { group: "Overview", items: [{ label: "Dashboard", to: "/", icon: "home", end: true }] },
  {
    group: "Accounts",
    items: [
      { label: "Import accounts", to: "/import", icon: "upload" },
      { label: "Students", to: "/students", icon: "user" },
      { label: "Faculty", to: "/faculty", icon: "users" },
      { label: "Add person", to: "/add", icon: "plus" }
    ]
  },
  { group: "Records", items: [{ label: "Activity log", to: "/activity", icon: "clock" }] }
];

const TITLES = {
  "/": "Dashboard",
  "/import": "Import accounts",
  "/review": "Review import",
  "/students": "Students",
  "/faculty": "Faculty",
  "/add": "Add person",
  "/activity": "Activity log",
  "/profile": "Profile"
};

function Sidebar({ open, onClose }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const signOut = async () => { await logout(); navigate("/login"); };
  return (
    <aside className={"sidebar" + (open ? " open" : "")} aria-label="Sidebar">
      <Link className="brand" to="/" aria-label="CCS Hub home">
        <img className="brand-logo" src="/qcu-logo.png" alt="" width="40" height="40" />
        <span>
          <span className="brand-name">CCS Hub</span>
          <span className="brand-sub">Quezon City University</span>
        </span>
      </Link>

      <nav className="nav" aria-label="Main">
        {NAV.map((g) => (
          <div className="nav-group" key={g.group}>
            <span className="nav-heading">{g.group}</span>
            {g.items.map((n) => {
              // the review page belongs to the Import step
              const forceActive = n.to === "/import" && pathname === "/review";
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  onClick={onClose}
                  className={({ isActive }) => (isActive || forceActive ? "active" : "")}
                >
                  <Icon name={n.icon} />
                  {n.label}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-foot">
        <Link className="sidebar-user" to="/profile" onClick={onClose} aria-label="Your profile">
          <Avatar name={user.name} photo={user.photo} />
          <span className="sidebar-user-text"><strong>{user.name}</strong><small>{user.role}</small></span>
        </Link>
        <button className="sidebar-logout" onClick={signOut} aria-label="Log out" title="Log out"><Icon name="logout" /></button>
      </div>
    </aside>
  );
}

function Topbar({ onMenu }) {
  const { user } = useAuth();
  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
      <Link className="topbar-brand" to="/" aria-label="CCS Hub home"><img src="/qcu-logo.png" alt="" width="28" height="28" />CCS Hub</Link>
      <div className="topbar-right">
        <Avatar as={Link} to="/profile" aria-label="Your profile" name={user.name} photo={user.photo} />
      </div>
    </header>
  );
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // close the mobile menu after navigating, return to the top, and name the browser tab after the page
  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
    document.title = TITLES[pathname] ? `${TITLES[pathname]} · CCS Hub` : "CCS Hub";
  }, [pathname]);

  return (
    <div className="app">
      <a className="skip-link" href="#content">Skip to content</a>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} aria-hidden="true" />}
      <div className="main">
        <Topbar onMenu={() => setMenuOpen(true)} />
        <main className="content" id="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
