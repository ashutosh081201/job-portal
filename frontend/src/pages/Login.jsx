import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getThemeStyles } from "../utils/theme";

const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { isDark } = useTheme();
  const t = getThemeStyles(isDark);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState(() =>
    new URLSearchParams(window.location.search).has("expired")
      ? "Your session has expired. Please log in again."
      : "",
  );
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/login", formData);
      login(res.data.user, res.data.token);
      if (res.data.user.role === "recruiter") {
        navigate("/recruiter/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      const message = err.response?.data?.message;
      const email = err.response?.data?.email;
      if (message === "Please verify your email first" && email) {
        navigate("/verify-otp", { state: { email, type: "register" } });
        return;
      }
      setError(message || "Something went wrong");
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%",
    background: t.input,
    border: `1px solid ${t.inputBorder}`,
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "14px",
    color: t.inputText,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          background: t.cardBg,
          border: `1px solid ${t.border}`,
          borderRadius: "16px",
          padding: "40px",
          width: "100%",
          maxWidth: "420px",
        }}
      >
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "700",
            color: t.text,
            textAlign: "center",
            margin: "0 0 8px",
          }}
        >
          Welcome Back
        </h2>
        <p
          style={{
            color: t.muted,
            textAlign: "center",
            fontSize: "14px",
            margin: "0 0 28px",
          }}
        >
          Sign in to your account
        </p>

        {error && (
          <div
            style={{
              background: isDark ? "#2d1515" : "#fef2f2",
              border: "1px solid #f87171",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "20px",
              color: "#ef4444",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "500",
                color: t.label,
                marginBottom: "6px",
              }}
            >
              Email
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder="john@gmail.com"
            />
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "500",
                color: t.label,
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              style={inputStyle}
              placeholder="••••••••"
            />
          </div>

          <div style={{ textAlign: "right", marginBottom: "20px" }}>
            <Link
              to="/forgot-password"
              style={{
                color: "#3b82f6",
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              background: loading ? "#93c5fd" : "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: t.muted,
            marginTop: "20px",
          }}
        >
          Don't have an account?{" "}
          <Link
            to="/register"
            style={{
              color: "#3b82f6",
              textDecoration: "none",
              fontWeight: "500",
            }}
          >
            Register
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
