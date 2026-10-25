import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getThemeStyles } from "../utils/theme";

const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { isDark } = useTheme();
  const t = getThemeStyles(isDark);

  const email = location.state?.email;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState("");

  if (!email) {
    navigate("/register");
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-otp", { email, otp });
      login(res.data.user, res.data.token);
      if (res.data.user.role === "recruiter") {
        navigate("/recruiter/dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP");
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    setError("");
    setResendSuccess("");
    try {
      await api.post("/auth/resend-otp", { email });
      setResendSuccess("New OTP sent to your email");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    }
    setResending(false);
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
          Verify Your Email
        </h2>
        <p
          style={{
            color: t.muted,
            textAlign: "center",
            fontSize: "14px",
            margin: "0 0 28px",
          }}
        >
          Enter the OTP sent to{" "}
          <strong style={{ color: t.text }}>{email}</strong>
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

        {resendSuccess && (
          <div
            style={{
              background: isDark ? "#14532d" : "#f0fdf4",
              border: "1px solid #22c55e",
              borderRadius: "8px",
              padding: "12px",
              marginBottom: "16px",
              color: "#22c55e",
              fontSize: "14px",
            }}
          >
            {resendSuccess}
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
              Enter OTP
            </label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              maxLength={6}
              style={{
                width: "100%",
                background: t.input,
                border: `1px solid ${t.inputBorder}`,
                borderRadius: "8px",
                padding: "12px",
                fontSize: "24px",
                color: t.inputText,
                outline: "none",
                textAlign: "center",
                letterSpacing: "8px",
                boxSizing: "border-box",
              }}
              placeholder="000000"
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
            {loading ? "Verifying..." : "Verify OTP"}
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
          Didn't receive OTP?{" "}
          <button
            onClick={handleResend}
            disabled={resending}
            style={{
              background: "none",
              border: "none",
              color: "#3b82f6",
              cursor: resending ? "not-allowed" : "pointer",
              fontSize: "14px",
              fontWeight: "500",
              padding: 0,
            }}
          >
            {resending ? "Sending..." : "Resend OTP"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default VerifyOTP;
