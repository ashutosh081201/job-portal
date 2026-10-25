import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { getThemeStyles } from "../utils/theme";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const t = getThemeStyles(isDark);

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { email });
      navigate("/verify-forgot-otp", { state: { email } });
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
    setLoading(false);
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
          Forgot Password
        </h2>
        <p
          style={{
            color: t.muted,
            textAlign: "center",
            fontSize: "14px",
            margin: "0 0 28px",
          }}
        >
          Enter your email to receive an OTP
        </p>

        {error && (
          <div
            style={{
              background: isDark ? "#2d1515" : "#fef2f2",
              border: "1px solid #f87171",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "16px",
              color: "#ef4444",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "500",
                color: t.label,
                marginBottom: "6px",
              }}
            >
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                background: t.input,
                border: `1px solid ${t.inputBorder}`,
                borderRadius: "8px",
                padding: "10px 12px",
                fontSize: "14px",
                color: t.inputText,
                outline: "none",
                boxSizing: "border-box",
              }}
              placeholder="john@gmail.com"
            />
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
            {loading ? "Sending OTP..." : "Send OTP"}
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
          Remember your password?{" "}
          <Link
            to="/login"
            style={{
              color: "#3b82f6",
              textDecoration: "none",
              fontWeight: "500",
            }}
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
