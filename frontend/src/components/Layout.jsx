import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
      <Link className="brand" to="/" aria-label="CCS Connect home">
        <img className="brand-logo" src="/qcu-logo.png" alt="" width="40" height="40" />
        <span>
          <span className="brand-name">CCS Connect</span>
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
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const onPeoplePage = pathname === "/students" || pathname === "/faculty";
  const [local, setLocal] = useState("");
  const value = onPeoplePage ? params.get("q") || "" : local;
  const input = useRef();

  // press "/" anywhere to jump to search
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
    if (onPeoplePage) setParams(v ? { q: v } : {}, { replace: true });
    else setLocal(v);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !onPeoplePage) {
      navigate("/students?q=" + encodeURIComponent(local.trim()));
    }
  };

  return (
    <header className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
      <Link className="topbar-brand" to="/" aria-label="CCS Connect home"><img src="/qcu-logo.png" alt="" width="28" height="28" />CCS Connect</Link>
      <div className="topbar-right">
        <label className="search">
          <Icon name="search" />
          <input
            ref={input}
            type="search"
            placeholder="Search by name or ID number"
            aria-label="Search by name or ID number"
            value={value}
            onChange={onChange}
            onKeyDown={onKeyDown}
          />
          <kbd aria-hidden="true">/</kbd>
        </label>
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
    document.title = TITLES[pathname] ? `${TITLES[pathname]} · CCS Connect` : "CCS Connect";
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
