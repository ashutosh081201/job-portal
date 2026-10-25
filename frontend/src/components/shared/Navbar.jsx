import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useIsMobile } from "../../hooks/useIsMobile";

const Navbar = () => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(location.pathname);

  // close the mobile menu whenever the route changes
  if (menuPath !== location.pathname) {
    setMenuPath(location.pathname);
    setMenuOpen(false);
  }

  const handleLogout = () => {
    logout();
    navigate("/");
    setMenuOpen(false);
  };

  const navBg = isDark ? "#020617" : "#1e293b";
  const navBorder = isDark ? "#1e293b" : "#0f172a";
  const navMuted = isDark ? "#94a3b8" : "#cbd5e1";
  const toggleBg = isDark ? "#1e293b" : "#0f172a";
  const menuBg = isDark ? "#0f172a" : "#1e293b";

  const linkStyle = {
    color: navMuted,
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "500",
  };

  const mobileLinkStyle = {
    color: "#e2e8f0",
    textDecoration: "none",
    fontSize: "17px",
    fontWeight: "500",
    padding: "14px 0",
    borderBottom: `1px solid #1e293b`,
    display: "block",
  };

  return (
    <>
      <nav
        style={{
          background: navBg,
          borderBottom: `1px solid ${navBorder}`,
          padding: "0 24px",
          height: "60px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Link
          to="/"
          style={{
            color: "#ffffff",
            textDecoration: "none",
            fontSize: "20px",
            fontWeight: "700",
            letterSpacing: "-0.5px",
          }}
        >
          Job<span style={{ color: "#3b82f6" }}>Verse</span>
        </Link>

        {/* Desktop nav */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <Link to="/jobs" style={linkStyle}>
              Browse Jobs
            </Link>
            {user?.role === "jobseeker" && (
              <>
                <Link to="/dashboard" style={linkStyle}>
                  Dashboard
                </Link>
                <Link to="/resume/builder" style={linkStyle}>
                  Resume
                </Link>
                <Link to="/ats" style={linkStyle}>
                  ATS Checker
                </Link>
              </>
            )}
            {user?.role === "recruiter" && (
              <>
                <Link to="/recruiter/dashboard" style={linkStyle}>
                  Dashboard
                </Link>
                <Link to="/post-job" style={linkStyle}>
                  Post Job
                </Link>
              </>
            )}
            <button
              onClick={toggleTheme}
              style={{
                background: toggleBg,
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: "16px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            {!user && (
              <>
                <Link to="/login" style={linkStyle}>
                  Login
                </Link>
                <Link
                  to="/register"
                  style={{
                    background: "#3b82f6",
                    color: "#fff",
                    textDecoration: "none",
                    fontSize: "14px",
                    fontWeight: "600",
                    padding: "8px 16px",
                    borderRadius: "8px",
                  }}
                >
                  Register
                </Link>
              </>
            )}
            {user && (
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <Link
                  to="/profile"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    background: "#3b82f6",
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: "14px",
                    textDecoration: "none",
                  }}
                >
                  {user.name?.charAt(0).toUpperCase()}
                </Link>
                <button
                  onClick={handleLogout}
                  style={{
                    background: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    fontSize: "14px",
                    fontWeight: "600",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}

        {/* Mobile: theme + hamburger */}
        {isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              onClick={toggleTheme}
              style={{
                background: toggleBg,
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "6px 10px",
                cursor: "pointer",
                fontSize: "15px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              style={{
                background: "none",
                border: "none",
                color: "#e2e8f0",
                fontSize: "26px",
                cursor: "pointer",
                padding: "2px 4px",
                lineHeight: 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        )}
      </nav>

      {/* Mobile menu overlay */}
      {isMobile && menuOpen && (
        <div
          style={{
            position: "fixed",
            top: "60px",
            left: 0,
            right: 0,
            bottom: 0,
            background: menuBg,
            zIndex: 99,
            padding: "8px 24px 32px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Nav links */}
          <Link
            to="/jobs"
            style={mobileLinkStyle}
            onClick={() => setMenuOpen(false)}
          >
            Browse Jobs
          </Link>

          {user?.role === "jobseeker" && (
            <>
              <Link
                to="/dashboard"
                style={mobileLinkStyle}
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/resume/builder"
                style={mobileLinkStyle}
                onClick={() => setMenuOpen(false)}
              >
                Resume Builder
              </Link>
              <Link
                to="/my-resumes"
                style={mobileLinkStyle}
                onClick={() => setMenuOpen(false)}
              >
                My Resumes
              </Link>
              <Link
                to="/ats"
                style={mobileLinkStyle}
                onClick={() => setMenuOpen(false)}
              >
                ATS Checker
              </Link>
            </>
          )}

          {user?.role === "recruiter" && (
            <>
              <Link
                to="/recruiter/dashboard"
                style={mobileLinkStyle}
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/post-job"
                style={mobileLinkStyle}
                onClick={() => setMenuOpen(false)}
              >
                Post Job
              </Link>
            </>
          )}

          {user && (
            <Link
              to="/profile"
              style={mobileLinkStyle}
              onClick={() => setMenuOpen(false)}
            >
              Profile
            </Link>
          )}

          {/* ── KEY FIX: non-logged-in → buttons appear right after links (no empty space)
                        logged-in      → logout pinned to bottom ───────────────────────── */}
          {!user && (
            // No marginTop: "auto" — appears right below Browse Jobs
            <div
              style={{
                paddingTop: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <Link
                to="/login"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "14px",
                  borderRadius: "10px",
                  border: "1px solid #334155",
                  color: "#e2e8f0",
                  textDecoration: "none",
                  fontSize: "15px",
                  fontWeight: "600",
                }}
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMenuOpen(false)}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "14px",
                  borderRadius: "10px",
                  background: "#3b82f6",
                  color: "#fff",
                  textDecoration: "none",
                  fontSize: "15px",
                  fontWeight: "600",
                }}
              >
                Register
              </Link>
            </div>
          )}

          {user && (
            // marginTop: "auto" → logout stays at bottom (intentional)
            <div style={{ marginTop: "auto", paddingTop: "24px" }}>
              <button
                onClick={handleLogout}
                style={{
                  width: "100%",
                  background: "#3b82f6",
                  color: "#fff",
                  border: "none",
                  fontSize: "15px",
                  fontWeight: "600",
                  padding: "14px",
                  borderRadius: "10px",
                  cursor: "pointer",
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Navbar;
