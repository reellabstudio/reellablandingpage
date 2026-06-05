import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Logo, Badge, Avatar } from "./Logo";
import { Sun, Moon, Bell, LogOut, Settings, Shield } from "lucide-react";
import { useState, useRef, useEffect } from "react";

const TABS_USER = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/projects", label: "Projects" },
  { to: "/editor", label: "Editor" },
  { to: "/content-studio", label: "Captions & Calendar" },
  { to: "/library", label: "Library" },
  { to: "/invoices", label: "Billing" },
  { to: "/community", label: "Community" },
  { to: "/sparks", label: "Sparks" },
];
const TABS_CEO = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/projects", label: "Projects" },
  { to: "/clients", label: "Clients" },
  { to: "/editor", label: "Editor" },
  { to: "/content-studio", label: "Captions & Calendar" },
  { to: "/library", label: "Library" },
  { to: "/invoices", label: "Billing" },
  { to: "/community", label: "Community" },
  { to: "/sparks", label: "Sparks" },
];

export default function Layout({ children }) {
  const { user, theme, setTheme, logout } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);
  const TABS = user?.role === "ceo" ? TABS_CEO : TABS_USER;

  useEffect(() => {
    const fn = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const onLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header className="topnav">
        <Link to="/dashboard" data-testid="nav-logo-link"><Logo /></Link>
        <nav className="nav-links">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} data-testid={`nav-${t.label.toLowerCase().replace(/ /g, "-")}`}>
              {t.label}
            </NavLink>
          ))}
          {user?.role === "ceo" && (
            <NavLink to="/ceo" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} data-testid="nav-ceo">
              <Shield size={13} style={{ display: "inline", marginRight: 4 }} />
              CEO
            </NavLink>
          )}
        </nav>
        <div className="nav-right">
          <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme" data-testid="theme-toggle">
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <button className="icon-btn" title="Notifications" data-testid="notifications-btn"><Bell size={17} /></button>
          <div style={{ position: "relative" }} ref={ref}>
            <button onClick={() => setMenu(!menu)} className="icon-btn" style={{ padding: 0 }} data-testid="user-menu-btn">
              <Avatar user={user} size={32} />
            </button>
            {menu && (
              <div style={{
                position: "absolute", top: 44, right: 0, background: "var(--surface)",
                border: "0.5px solid var(--border2)", borderRadius: 10, padding: 8,
                width: 220, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", zIndex: 200,
              }} data-testid="user-menu-dropdown">
                <div style={{ padding: "10px 12px", borderBottom: "0.5px solid var(--border)", marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, display: "flex", alignItems: "center" }}>
                    {user?.display_name} <Badge type={user?.badge} />
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-sec)" }}>@{user?.username}</div>
                </div>
                <Link to="/profile" className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", borderRadius: 6 }} onClick={() => setMenu(false)} data-testid="menu-profile">
                  <Settings size={14} /> Profile & Settings
                </Link>
                <button onClick={onLogout} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 12px", borderRadius: 6, color: "var(--coral)" }} data-testid="menu-logout">
                  <LogOut size={14} /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">{children}</main>

      {/* Mobile bottom tabs */}
      <div className="bottom-tabs">
        {TABS.slice(0, 5).map((t) => {
          const active = loc.pathname.startsWith(t.to);
          return (
            <button key={t.to} className={`tab ${active ? "active" : ""}`} onClick={() => navigate(t.to)} data-testid={`mobile-tab-${t.label.toLowerCase()}`}>
              <span style={{ fontSize: 16 }}>{t.label[0]}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
