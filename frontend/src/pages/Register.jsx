import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { getThemeStyles } from "../utils/theme";

const Register = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const t = getThemeStyles(isDark);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "jobseeker",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/register", formData);
      navigate("/verify-otp", {
        state: { email: res.data.email, type: "register" },
      });
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
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
          Create Account
        </h2>
        <p
          style={{
            color: t.muted,
            textAlign: "center",
            fontSize: "14px",
            margin: "0 0 28px",
          }}
        >
          Join thousands of job seekers
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
          {[
            {
              name: "name",
              label: "Full Name",
              type: "text",
              placeholder: "John Doe",
            },
            {
              name: "email",
              label: "Email",
              type: "email",
              placeholder: "john@gmail.com",
            },
            {
              name: "password",
              label: "Password",
              type: "password",
              placeholder: "••••••••",
            },
          ].map((field) => (
            <div key={field.name} style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: "500",
                  color: t.label,
                  marginBottom: "6px",
                }}
              >
                {field.label}
              </label>
              <input
                type={field.type}
                name={field.name}
                value={formData[field.name]}
                onChange={handleChange}
                required
                style={inputStyle}
                placeholder={field.placeholder}
              />
            </div>
          ))}

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
              I am a
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              style={{ ...inputStyle }}
            >
              <option value="jobseeker">Job Seeker</option>
              <option value="recruiter">Recruiter</option>
            </select>
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
            {loading ? "Sending OTP..." : "Register"}
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
          Already have an account?{" "}
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

export default Register;
