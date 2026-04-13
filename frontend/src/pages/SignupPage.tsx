import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function SignupPage() {
  const { api, setToken, token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) navigate("/files", { replace: true });
  }, [token, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const res = await api.post("/auth/signup", form);
      setToken(res.data.token);
      navigate("/files");
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } }; message?: string };
      setMessage(ax.response?.data?.message || ax.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <aside className="auth-aside" aria-hidden>
        <div className="auth-aside-inner">
          <h2>Start in seconds</h2>
          <p>
            Upload files to secure storage, preview with expiring links, and manage everything
            from one dashboard.
          </p>
        </div>
      </aside>
      <div className="auth-panel">
        <div className="auth-card">
          <h1>Create your account</h1>
          <p className="sub">No credit card required for this demo.</p>
          <form onSubmit={submit} className="stack">
            <div className="field">
              <label htmlFor="signup-name">Full name</label>
              <input
                id="signup-name"
                autoComplete="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
          {message && <p className="message error">{message}</p>}
          <p className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
