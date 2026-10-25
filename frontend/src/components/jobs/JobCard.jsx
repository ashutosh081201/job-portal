import { Link } from "react-router-dom";
import { getDeadlineInfo } from "../../utils/jobs";

const JobCard = ({ job, isDark, t, savedJobIds = [], onToggleSave }) => {
  const workTypeBadge = {
    Remote: { bg: isDark ? "#14532d" : "#dcfce7", color: "#22c55e" },
    "On-site": { bg: isDark ? "#1e3a5f" : "#dbeafe", color: "#3b82f6" },
    Hybrid: { bg: isDark ? "#2e1065" : "#ede9fe", color: "#a855f7" },
  };

  const expBadge = { bg: isDark ? "#422006" : "#fef9c3", color: "#ca8a04" };
  const wt = workTypeBadge[job.workType] || workTypeBadge["On-site"];
  const showSalary = job.salary && job.salary !== "Not Disclosed";
  const isSaved = savedJobIds.includes(job._id);
  const deadlineInfo = getDeadlineInfo(job.deadline, job.status);
  const isClosed = job.status === "closed" || deadlineInfo?.isClosed;

  return (
    <div style={{ background: t.cardBg, border: "1px solid " + (isClosed ? (isDark ? "#4b1515" : "#fecaca") : t.border), borderRadius: "12px", padding: "24px", opacity: isClosed ? 0.8 : 1, position: "relative" }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: t.text, margin: 0 }}>{job.title}</h2>
            {isClosed && <span style={{ background: "#ef4444", color: "#fff", fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "999px", flexShrink: 0 }}>CLOSED</span>}
          </div>
          <p style={{ color: t.muted, fontSize: "14px", margin: "0 0 4px" }}>{job.company} • {job.location}</p>
          {showSalary && <p style={{ color: "#22c55e", fontSize: "14px", fontWeight: "600", margin: 0 }}>{job.salary}</p>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "12px", flexShrink: 0 }}>
          {onToggleSave && (
            <button
              onClick={(e) => { e.preventDefault(); onToggleSave(job._id); }}
              title={isSaved ? "Remove from saved" : "Save job"}
              style={{ background: isSaved ? (isDark ? "#1e3a5f" : "#dbeafe") : "none", border: "1px solid " + (isSaved ? "#3b82f6" : t.border), borderRadius: "8px", padding: "7px 12px", cursor: "pointer", fontSize: "13px", color: isSaved ? "#3b82f6" : t.muted, fontWeight: isSaved ? "600" : "400" }}
            >
              {isSaved ? "Saved" : "Save"}
            </button>
          )}
          <Link
            to={"/jobs/" + job._id}
            style={{ background: isClosed ? (isDark ? "#1e293b" : "#f1f5f9") : "#3b82f6", color: isClosed ? t.muted : "#fff", textDecoration: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "600", whiteSpace: "nowrap", border: isClosed ? "1px solid " + t.border : "none" }}
          >
            {isClosed ? "View" : "View Job"}
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
        {job.workType && <span style={{ background: wt.bg, color: wt.color, padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "500" }}>{job.workType}</span>}
        {job.experienceRequired && <span style={{ background: expBadge.bg, color: expBadge.color, padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "500" }}>{job.experienceRequired}</span>}
        {(job.skills || []).map((skill, i) => (
          <span key={i} style={{ background: isDark ? "#1e293b" : "#f1f5f9", color: t.muted, padding: "4px 10px", borderRadius: "999px", fontSize: "12px" }}>{skill}</span>
        ))}
        {deadlineInfo && (
          <span style={{ background: isDark ? "#1e293b" : "#f8fafc", color: deadlineInfo.color, padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "500", border: "1px solid " + deadlineInfo.color + "50" }}>
            {deadlineInfo.text}
          </span>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
        <p style={{ color: t.muted, fontSize: "12px", margin: 0 }}>Posted by {job.recruiterId?.name || "Recruiter"}</p>
        {job.applicationCount !== undefined && (
          <span style={{ background: isDark ? "#1e293b" : "#f1f5f9", color: t.muted, border: "1px solid " + t.border, padding: "2px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "500" }}>
            {job.applicationCount} applied
          </span>
        )}
      </div>
    </div>
  );
};

export default JobCard;
