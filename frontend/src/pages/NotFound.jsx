import { Link } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { getThemeStyles } from "../utils/theme";

const NotFound = () => {
  const { isDark } = useTheme();
  const t = getThemeStyles(isDark);

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
      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "80px", margin: "0 0 16px" }}>🔍</p>
        <h1
          style={{
            fontSize: "48px",
            fontWeight: "700",
            color: t.text,
            margin: "0 0 8px",
          }}
        >
          404
        </h1>
        <p style={{ fontSize: "18px", color: t.muted, margin: "0 0 32px" }}>
          Page not found
        </p>
        <Link
          to="/"
          style={{
            background: "#3b82f6",
            color: "#fff",
            textDecoration: "none",
            padding: "12px 28px",
            borderRadius: "8px",
            fontSize: "15px",
            fontWeight: "600",
          }}
        >
          Go Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
