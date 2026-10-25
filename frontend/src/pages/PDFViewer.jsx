import { useNavigate } from "react-router-dom";

const PDFViewer = () => {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const pdfUrl = urlParams.get("url");
  const googleViewerUrl = pdfUrl
    ? "https://docs.google.com/viewer?url=" + encodeURIComponent(pdfUrl) + "&embedded=true"
    : null;
  if (!pdfUrl) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#94a3b8" }}>No PDF URL provided.</p>
      </div>
    );
  }
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0f172a" }}>
      <div style={{ background: "#1e293b", borderBottom: "1px solid #334155", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <button onClick={() => navigate(-1)} style={{ background: "none", border: "1px solid #334155", borderRadius: "8px", padding: "7px 16px", color: "#e2e8f0", fontSize: "14px", fontWeight: "500", cursor: "pointer" }}>
          Back
        </button>
        <span style={{ color: "#94a3b8", fontSize: "13px" }}>Uploaded Resume</span>
        <a href={pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: "#3b82f6", fontSize: "13px", textDecoration: "none" }}>
          Open in tab
        </a>
      </div>
      <iframe src={googleViewerUrl} style={{ flex: 1, border: "none", width: "100%", background: "#fff" }} title="Uploaded Resume PDF" />
    </div>
  );
};

export default PDFViewer;
