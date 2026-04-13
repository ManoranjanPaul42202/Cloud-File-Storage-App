import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { API_BASE_URL, useAuth } from "../context/AuthContext";

function CloudIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  );
}

export function Layout() {
  const { token, clearAuth, api } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* still sign out locally */
    }
    clearAuth();
    navigate("/login");
  };

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <NavLink to={token ? "/files" : "/login"} className="brand-link">
            <span className="brand-mark">
              <CloudIcon />
            </span>
            Nimbus Drive
          </NavLink>
          <nav className="nav">
            {token ? (
              <>
                <NavLink
                  to="/files"
                  className={({ isActive }) =>
                    "nav-link" + (isActive ? " active" : "")
                  }
                >
                  My files
                </NavLink>
                <button type="button" className="btn-ghost" onClick={handleLogout}>
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    "nav-link" + (isActive ? " active" : "")
                  }
                >
                  Sign in
                </NavLink>
                <NavLink
                  to="/signup"
                  className={({ isActive }) =>
                    "nav-link" + (isActive ? " active" : "")
                  }
                >
                  Create account
                </NavLink>
              </>
            )}
          </nav>
        </div>
        <div className="site-footer-note">API · {API_BASE_URL}</div>
      </header>
      <div className="page-main">
        <Outlet />
      </div>
    </>
  );
}
