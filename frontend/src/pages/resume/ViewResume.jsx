import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import JakesTemplate from "../../components/resume/JakesTemplate";
import api from "../../services/api";
import { useWindowWidth } from "../../hooks/useWindowWidth";

const TEMPLATE_WIDTH = 794;

const ViewResume = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 900;
  const scale = isMobile ? Math.min(1, (windowWidth - 24) / TEMPLATE_WIDTH) : 1;
  const scaledWidth = Math.round(TEMPLATE_WIDTH * scale);

  useEffect(() => {
    const fetchResume = async () => {
      try {
        const res = await api.get(`/resume/view/${id}`);
        if (res.data?.resume) {
          setResume(res.data.resume);
        } else {
          setError("Resume data could not be loaded.");
        }
      } catch (err) {
        setError(
          err.response?.status === 401
            ? "Please log in to view this resume."
            : err.response?.data?.message || "Resume not found or access denied.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchResume();
  }, [id]);

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#64748b", fontSize: "15px" }}>Loading resume...</p>
      </div>
    );

  if (error)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <p style={{ fontSize: "32px", margin: 0 }}>⚠️</p>
        <p style={{ color: "#ef4444", fontSize: "15px", margin: 0 }}>{error}</p>
      </div>
    );

  if (!resume)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#e2e8f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#64748b", fontSize: "15px" }}>Resume not found.</p>
      </div>
    );

  const resumeName = resume.personalInfo?.name
    ? `${resume.personalInfo.name}'s Resume`
    : "Resume";

  return (
    <div
      style={{ minHeight: "100vh", background: "#e2e8f0", overflowX: "hidden" }}
    >
      {/* ✅ Back button bar — mobile gets stacked layout, desktop unchanged */}
      {isMobile ? (
        // Mobile — stacked: back button row, then name on its own row (fixes wrap/misalign)
        <div
          style={{
            background: "#1e293b",
            padding: "12px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "none",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "7px 16px",
              color: "#e2e8f0",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              alignSelf: "flex-start",
            }}
          >
            ← Back
          </button>
          <span
            style={{
              color: "#94a3b8",
              fontSize: "13px",
              textAlign: "left",
            }}
          >
            {resumeName}
          </span>
        </div>
      ) : (
        // Desktop — original single-row layout, unchanged
        <div
          style={{
            background: "#1e293b",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              background: "none",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "7px 16px",
              color: "#e2e8f0",
              fontSize: "14px",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            ← Back
          </button>
          <span style={{ color: "#94a3b8", fontSize: "13px" }}>
            {resumeName}
          </span>
          <div style={{ width: "80px" }} />
        </div>
      )}

      {/* Resume content */}
      {!isMobile ? (
        // Desktop — normal full size
        <div
          style={{
            padding: "32px 24px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <JakesTemplate data={resume} />
        </div>
      ) : (
        // Mobile — scaled to fit screen
        <div
          style={{
            padding: "16px 0 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: `${scaledWidth}px`,
              overflow: "hidden",
              boxShadow: "0 4px 24px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                transform: `scale(${scale})`,
                transformOrigin: "top left",
                width: `${TEMPLATE_WIDTH}px`,
              }}
            >
              <JakesTemplate data={resume} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewResume;
