import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { getThemeStyles } from "../../utils/theme";
import { getDeadlineInfo } from "../../utils/jobs";

const JobDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const t = getThemeStyles(isDark);

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resume, setResume] = useState(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savedResumes, setSavedResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [resumeOption, setResumeOption] = useState("upload");
  const [isSaved, setIsSaved] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [checkingATS, setCheckingATS] = useState(false);
  const [atsResult, setAtsResult] = useState(null);
  const [atsError, setAtsError] = useState("");
  const [atsResumeId, setAtsResumeId] = useState(null);
  const [showATSSection, setShowATSSection] = useState(false);

  const fetchJob = async () => {
    try {
      const res = await api.get("/jobs/" + id);
      setJob(res.data.job);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // ✅ FIXED — uses dedicated endpoint that does a direct DB lookup
  // for this specific job only. Previously fetched ALL applications
  // with pagination (limit 8) so if user had 8+ applications the
  // specific job was not found and apply section kept showing.
  const checkIfApplied = async () => {
    try {
      const res = await api.get("/applications/check/" + id);
      setApplied(res.data.applied);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSavedResumes = async () => {
    try {
      const res = await api.get("/resume/all");
      if (res.data.resumes?.length > 0) {
        setSavedResumes(res.data.resumes);
        setSelectedResumeId(res.data.resumes[0]._id);
        setAtsResumeId(res.data.resumes[0]._id);
        setResumeOption("saved");
      }
    } catch {
      setSavedResumes([]);
    }
  };

  const fetchSavedStatus = async () => {
    try {
      const res = await api.get("/saved-jobs/ids");
      setIsSaved((res.data.jobIds || []).includes(id));
    } catch {
      // not critical: the button just shows "Save"
    }
  };

  // fetchJob runs on id change — doesn't need user
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    fetchJob();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the id changes
  }, [id]);

  // ✅ seeker-specific calls run when BOTH id AND user are ready
  // previously only had [id] — if user loaded after id, these never ran
  useEffect(() => {
    if (user?.role === "jobseeker") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
      checkIfApplied();
      fetchSavedResumes();
      fetchSavedStatus();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rerun only when the job or the user changes
  }, [id, user]);

  const handleToggleSave = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    setSavingJob(true);
    try {
      const res = await api.post("/saved-jobs/toggle", { jobId: id });
      setIsSaved(res.data.saved);
    } catch (err) {
      alert(errorMessage(err, "Failed to save job"));
    }
    setSavingJob(false);
  };

  const handleApply = async () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (resumeOption === "upload" && !resume) {
      setError("Please select your resume PDF");
      return;
    }
    if (resumeOption === "saved" && !selectedResumeId) {
      setError("Please select a resume");
      return;
    }
    setApplying(true);
    setError("");
    try {
      if (resumeOption === "saved") {
        await api.post("/applications/apply-saved", {
          jobId: id,
          resumeId: selectedResumeId,
        });
      } else {
        const formData = new FormData();
        formData.append("jobId", id);
        formData.append("resume", resume);
        await api.post("/applications/apply", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setSuccess("Application submitted successfully!");
      setApplied(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to apply");
    }
    setApplying(false);
  };

  const handleCheckATS = async () => {
    if (!atsResumeId) {
      setAtsError("Please build a resume first");
      return;
    }
    setCheckingATS(true);
    setAtsError("");
    setAtsResult(null);
    try {
      const res = await api.post("/ats/check-job", {
        jobId: id,
        resumeId: atsResumeId,
      });
      setAtsResult(res.data.data);
    } catch (err) {
      setAtsError(err.response?.data?.message || "ATS check failed");
    }
    setCheckingATS(false);
  };

  const getScoreColor = (score) =>
    score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const getScoreBg = (score) =>
    score >= 70
      ? isDark
        ? "#14532d"
        : "#f0fdf4"
      : score >= 50
        ? isDark
          ? "#422006"
          : "#fffbeb"
        : isDark
          ? "#2d1515"
          : "#fef2f2";

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: t.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: t.muted }}>Loading...</p>
      </div>
    );

  if (!job)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: t.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: t.muted }}>Job not found</p>
      </div>
    );

  const deadlineInfo = getDeadlineInfo(job.deadline, job.status, "detail");
  const isJobClosed = job.status === "closed" || deadlineInfo?.isClosed;

  return (
    <div style={{ minHeight: "100vh", background: t.bg, padding: "24px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "none",
              border: "1px solid " + t.border,
              borderRadius: "8px",
              padding: "8px 14px",
              color: t.muted,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Back
          </button>
          {user?.role === "jobseeker" && (
            <button
              onClick={handleToggleSave}
              disabled={savingJob}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: isSaved ? (isDark ? "#1e3a5f" : "#dbeafe") : "none",
                border: "1px solid " + (isSaved ? "#3b82f6" : t.border),
                borderRadius: "8px",
                padding: "8px 14px",
                color: isSaved ? "#3b82f6" : t.muted,
                fontSize: "14px",
                cursor: "pointer",
                fontWeight: isSaved ? "600" : "400",
              }}
            >
              {savingJob ? "..." : isSaved ? "Saved" : "Save Job"}
            </button>
          )}
        </div>

        {/* Job Header */}
        <div
          style={{
            background: t.cardBg,
            border: "1px solid " + (isJobClosed ? "#f87171" : t.border),
            borderRadius: "12px",
            padding: "28px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "8px",
            }}
          >
            <h1
              style={{
                fontSize: "26px",
                fontWeight: "700",
                color: t.text,
                margin: 0,
                flex: 1,
                minWidth: 0,
              }}
            >
              {job.title}
            </h1>
            {isJobClosed && (
              <span
                style={{
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: "11px",
                  fontWeight: "700",
                  padding: "3px 12px",
                  borderRadius: "999px",
                  marginLeft: "12px",
                  flexShrink: 0,
                }}
              >
                CLOSED
              </span>
            )}
          </div>
          <p style={{ color: t.muted, fontSize: "15px", margin: "0 0 4px" }}>
            {job.company} • {job.location}
          </p>
          {job.salary && job.salary !== "Not Disclosed" && (
            <p
              style={{ color: "#22c55e", fontWeight: "600", margin: "4px 0 0" }}
            >
              {job.salary}
            </p>
          )}
          {deadlineInfo && (
            <p
              style={{
                color: deadlineInfo.color,
                fontSize: "13px",
                fontWeight: "500",
                margin: "8px 0 0",
              }}
            >
              {deadlineInfo.text}
            </p>
          )}
          {job.applicationCount !== undefined && (
            <p style={{ color: t.muted, fontSize: "12px", margin: "8px 0 0" }}>
              {job.applicationCount} people applied
            </p>
          )}
        </div>

        {/* Skills */}
        {job.skills?.length > 0 && (
          <div
            style={{
              background: t.cardBg,
              border: "1px solid " + t.border,
              borderRadius: "12px",
              padding: "24px",
              marginBottom: "20px",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: t.text,
                margin: "0 0 14px",
              }}
            >
              Required Skills
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {job.skills.map((skill, i) => (
                <span
                  key={i}
                  style={{
                    background: isDark ? "#1e3a5f" : "#dbeafe",
                    color: isDark ? "#60a5fa" : "#1d4ed8",
                    padding: "6px 14px",
                    borderRadius: "999px",
                    fontSize: "13px",
                    fontWeight: "500",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        <div
          style={{
            background: t.cardBg,
            border: "1px solid " + t.border,
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "20px",
          }}
        >
          <h2
            style={{
              fontSize: "16px",
              fontWeight: "600",
              color: t.text,
              margin: "0 0 14px",
            }}
          >
            Job Description
          </h2>
          <p
            style={{
              color: t.subtext,
              lineHeight: "1.7",
              margin: 0,
              whiteSpace: "pre-line",
            }}
          >
            {job.description}
          </p>
        </div>

        {/* ATS Check Section */}
        {user?.role === "jobseeker" &&
          !isJobClosed &&
          savedResumes.length > 0 && (
            <div
              style={{
                background: t.cardBg,
                border: "1px solid " + t.border,
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: t.text,
                      margin: "0 0 4px",
                    }}
                  >
                    Check ATS Score
                  </h2>
                  <p style={{ color: t.muted, fontSize: "13px", margin: 0 }}>
                    See how well your resume matches this job
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowATSSection(!showATSSection);
                    setAtsResult(null);
                    setAtsError("");
                  }}
                  style={{
                    background: showATSSection
                      ? isDark
                        ? "#1e293b"
                        : "#f1f5f9"
                      : "#a855f7",
                    color: showATSSection ? t.muted : "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "13px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  {showATSSection ? "Close" : "Check ATS"}
                </button>
              </div>

              {showATSSection && (
                <div style={{ marginTop: "20px" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "13px",
                      fontWeight: "500",
                      color: t.label,
                      marginBottom: "8px",
                    }}
                  >
                    Select Resume to Check
                  </label>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                      marginBottom: "16px",
                    }}
                  >
                    {savedResumes.map((r, i) => (
                      <div
                        key={r._id}
                        onClick={() => setAtsResumeId(r._id)}
                        style={{
                          background:
                            atsResumeId === r._id
                              ? isDark
                                ? "#2e1065"
                                : "#f5f3ff"
                              : t.input,
                          border:
                            "1px solid " +
                            (atsResumeId === r._id ? "#a855f7" : t.inputBorder),
                          borderRadius: "8px",
                          padding: "10px 14px",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div>
                          <p
                            style={{
                              fontWeight: "600",
                              fontSize: "13px",
                              color: atsResumeId === r._id ? "#a855f7" : t.text,
                              margin: "0 0 2px",
                            }}
                          >
                            {r.name || "My Resume"}
                            {i === 0 && (
                              <span
                                style={{
                                  marginLeft: "8px",
                                  background: isDark ? "#1e3a5f" : "#dbeafe",
                                  color: "#3b82f6",
                                  padding: "1px 8px",
                                  borderRadius: "999px",
                                  fontSize: "11px",
                                }}
                              >
                                Latest
                              </span>
                            )}
                          </p>
                          <p
                            style={{
                              color: t.muted,
                              fontSize: "12px",
                              margin: 0,
                            }}
                          >
                            Updated {new Date(r.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        {atsResumeId === r._id && (
                          <span style={{ color: "#a855f7", fontSize: "16px" }}>
                            ✓
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {atsError && (
                    <div
                      style={{
                        background: isDark ? "#2d1515" : "#fef2f2",
                        border: "1px solid #f87171",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        color: "#ef4444",
                        fontSize: "14px",
                        marginBottom: "12px",
                      }}
                    >
                      {atsError}
                    </div>
                  )}

                  <button
                    onClick={handleCheckATS}
                    disabled={checkingATS}
                    style={{
                      width: "100%",
                      background: checkingATS ? "#c4b5fd" : "#a855f7",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "11px",
                      fontSize: "14px",
                      fontWeight: "600",
                      cursor: checkingATS ? "not-allowed" : "pointer",
                    }}
                  >
                    {checkingATS ? "Analyzing..." : "Check My ATS Score"}
                  </button>

                  {atsResult && (
                    <div
                      style={{
                        marginTop: "20px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          background: getScoreBg(atsResult.score),
                          border: "1px solid " + getScoreColor(atsResult.score),
                          borderRadius: "12px",
                          padding: "24px",
                          textAlign: "center",
                        }}
                      >
                        <p
                          style={{
                            color: t.muted,
                            fontSize: "13px",
                            margin: "0 0 6px",
                          }}
                        >
                          Your ATS Score for this job
                        </p>
                        <p
                          style={{
                            fontSize: "60px",
                            fontWeight: "700",
                            color: getScoreColor(atsResult.score),
                            margin: "0 0 4px",
                            lineHeight: 1,
                          }}
                        >
                          {atsResult.score}
                        </p>
                        <p
                          style={{
                            color: t.muted,
                            fontSize: "13px",
                            margin: "0 0 12px",
                          }}
                        >
                          out of 100
                        </p>
                        <p
                          style={{
                            color: t.subtext,
                            fontSize: "13px",
                            margin: 0,
                            lineHeight: "1.6",
                          }}
                        >
                          {atsResult.summary}
                        </p>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            background: t.cardBg,
                            border: "1px solid " + t.border,
                            borderRadius: "10px",
                            padding: "16px",
                          }}
                        >
                          <h3
                            style={{
                              color: "#22c55e",
                              fontWeight: "600",
                              margin: "0 0 10px",
                              fontSize: "13px",
                            }}
                          >
                            Matched ({atsResult.matchedKeywords.length})
                          </h3>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                            }}
                          >
                            {atsResult.matchedKeywords.map((kw, i) => (
                              <span
                                key={i}
                                style={{
                                  background: isDark ? "#14532d" : "#dcfce7",
                                  color: "#22c55e",
                                  padding: "3px 8px",
                                  borderRadius: "999px",
                                  fontSize: "11px",
                                  fontWeight: "500",
                                }}
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div
                          style={{
                            background: t.cardBg,
                            border: "1px solid " + t.border,
                            borderRadius: "10px",
                            padding: "16px",
                          }}
                        >
                          <h3
                            style={{
                              color: "#ef4444",
                              fontWeight: "600",
                              margin: "0 0 10px",
                              fontSize: "13px",
                            }}
                          >
                            Missing ({atsResult.missingKeywords.length})
                          </h3>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                            }}
                          >
                            {atsResult.missingKeywords.map((kw, i) => (
                              <span
                                key={i}
                                style={{
                                  background: isDark ? "#2d1515" : "#fef2f2",
                                  color: "#ef4444",
                                  padding: "3px 8px",
                                  borderRadius: "999px",
                                  fontSize: "11px",
                                  fontWeight: "500",
                                }}
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            background: t.cardBg,
                            border: "1px solid " + t.border,
                            borderRadius: "10px",
                            padding: "16px",
                          }}
                        >
                          <h3
                            style={{
                              color: t.text,
                              fontWeight: "600",
                              margin: "0 0 10px",
                              fontSize: "13px",
                            }}
                          >
                            Strengths
                          </h3>
                          <ul
                            style={{ margin: 0, padding: 0, listStyle: "none" }}
                          >
                            {atsResult.strengths.map((s, i) => (
                              <li
                                key={i}
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  color: t.subtext,
                                  fontSize: "12px",
                                  marginBottom: "6px",
                                  lineHeight: "1.5",
                                }}
                              >
                                <span
                                  style={{ color: "#22c55e", flexShrink: 0 }}
                                >
                                  •
                                </span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div
                          style={{
                            background: t.cardBg,
                            border: "1px solid " + t.border,
                            borderRadius: "10px",
                            padding: "16px",
                          }}
                        >
                          <h3
                            style={{
                              color: t.text,
                              fontWeight: "600",
                              margin: "0 0 10px",
                              fontSize: "13px",
                            }}
                          >
                            Improvements
                          </h3>
                          <ul
                            style={{ margin: 0, padding: 0, listStyle: "none" }}
                          >
                            {atsResult.improvements.map((imp, i) => (
                              <li
                                key={i}
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  color: t.subtext,
                                  fontSize: "12px",
                                  marginBottom: "6px",
                                  lineHeight: "1.5",
                                }}
                              >
                                <span
                                  style={{ color: "#3b82f6", flexShrink: 0 }}
                                >
                                  •
                                </span>
                                {imp}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <p
                        style={{
                          textAlign: "center",
                          color: t.muted,
                          fontSize: "12px",
                          margin: 0,
                        }}
                      >
                        View full ATS history in{" "}
                        <span
                          onClick={() => navigate("/ats")}
                          style={{
                            color: "#a855f7",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          ATS Checker
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        {/* No resume warning for ATS */}
        {user?.role === "jobseeker" &&
          !isJobClosed &&
          savedResumes.length === 0 && (
            <div
              style={{
                background: isDark ? "#2e1065" : "#f5f3ff",
                border: "1px solid #a855f7",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "20px",
              }}
            >
              <p
                style={{
                  color: "#a855f7",
                  fontWeight: "600",
                  margin: "0 0 4px",
                  fontSize: "14px",
                }}
              >
                Check Your ATS Score
              </p>
              <p style={{ color: t.muted, fontSize: "13px", margin: 0 }}>
                Build a resume first to check how well it matches this job.{" "}
                <span
                  onClick={() => navigate("/resume/builder")}
                  style={{
                    color: "#3b82f6",
                    cursor: "pointer",
                    textDecoration: "underline",
                  }}
                >
                  Build Resume
                </span>
              </p>
            </div>
          )}

        {/* Closed banner */}
        {isJobClosed && (
          <div
            style={{
              background: isDark ? "#2d1515" : "#fef2f2",
              border: "1px solid #f87171",
              borderRadius: "12px",
              padding: "16px",
              textAlign: "center",
              marginBottom: "20px",
            }}
          >
            <p style={{ color: "#ef4444", fontWeight: "600", margin: 0 }}>
              This job is no longer accepting applications
            </p>
          </div>
        )}

        {/* Already Applied */}
        {user?.role === "jobseeker" && applied && !isJobClosed && (
          <div
            style={{
              background: isDark ? "#14532d" : "#f0fdf4",
              border: "1px solid #22c55e",
              borderRadius: "12px",
              padding: "16px",
              textAlign: "center",
              color: "#22c55e",
              fontWeight: "600",
            }}
          >
            You have already applied for this job
          </div>
        )}

        {/* Apply Section */}
        {user?.role === "jobseeker" && !applied && !isJobClosed && (
          <div
            style={{
              background: t.cardBg,
              border: "1px solid " + t.border,
              borderRadius: "12px",
              padding: "24px",
            }}
          >
            <h2
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: t.text,
                margin: "0 0 16px",
              }}
            >
              Apply for this Job
            </h2>

            {error && (
              <div
                style={{
                  background: isDark ? "#2d1515" : "#fef2f2",
                  border: "1px solid #f87171",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  color: "#ef4444",
                  fontSize: "14px",
                  marginBottom: "16px",
                }}
              >
                {error}
              </div>
            )}
            {success && (
              <div
                style={{
                  background: isDark ? "#14532d" : "#f0fdf4",
                  border: "1px solid #22c55e",
                  borderRadius: "8px",
                  padding: "10px 12px",
                  color: "#22c55e",
                  fontSize: "14px",
                  marginBottom: "16px",
                }}
              >
                {success}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
              <button
                onClick={() => setResumeOption("upload")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "8px",
                  border:
                    "1px solid " +
                    (resumeOption === "upload" ? "#3b82f6" : t.inputBorder),
                  background:
                    resumeOption === "upload"
                      ? isDark
                        ? "#1e3a5f"
                        : "#dbeafe"
                      : t.input,
                  color: resumeOption === "upload" ? "#3b82f6" : t.muted,
                  fontSize: "13px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                Upload PDF
              </button>
              {savedResumes.length > 0 && (
                <button
                  onClick={() => setResumeOption("saved")}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "8px",
                    border:
                      "1px solid " +
                      (resumeOption === "saved" ? "#22c55e" : t.inputBorder),
                    background:
                      resumeOption === "saved"
                        ? isDark
                          ? "#14532d"
                          : "#dcfce7"
                        : t.input,
                    color: resumeOption === "saved" ? "#22c55e" : t.muted,
                    fontSize: "13px",
                    fontWeight: "500",
                    cursor: "pointer",
                  }}
                >
                  Saved Resume
                </button>
              )}
            </div>

            {resumeOption === "saved" && savedResumes.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "13px",
                    fontWeight: "500",
                    color: t.label,
                    marginBottom: "8px",
                  }}
                >
                  Select Resume
                </label>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {savedResumes.map((r, i) => (
                    <div
                      key={r._id}
                      onClick={() => setSelectedResumeId(r._id)}
                      style={{
                        background:
                          selectedResumeId === r._id
                            ? isDark
                              ? "#14532d"
                              : "#f0fdf4"
                            : t.input,
                        border:
                          "1px solid " +
                          (selectedResumeId === r._id
                            ? "#22c55e"
                            : t.inputBorder),
                        borderRadius: "8px",
                        padding: "12px 16px",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <p
                          style={{
                            fontWeight: "600",
                            fontSize: "14px",
                            color:
                              selectedResumeId === r._id ? "#22c55e" : t.text,
                            margin: "0 0 2px",
                          }}
                        >
                          {r.name || "My Resume"}
                          {i === 0 && (
                            <span
                              style={{
                                marginLeft: "8px",
                                background: isDark ? "#1e3a5f" : "#dbeafe",
                                color: "#3b82f6",
                                padding: "1px 8px",
                                borderRadius: "999px",
                                fontSize: "11px",
                              }}
                            >
                              Latest
                            </span>
                          )}
                        </p>
                        <p
                          style={{
                            color: t.muted,
                            fontSize: "12px",
                            margin: 0,
                          }}
                        >
                          Updated {new Date(r.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {selectedResumeId === r._id && (
                        <span style={{ color: "#22c55e", fontSize: "18px" }}>
                          ✓
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p
                  onClick={() => navigate("/my-resumes")}
                  style={{
                    color: "#3b82f6",
                    fontSize: "12px",
                    cursor: "pointer",
                    marginTop: "8px",
                    textDecoration: "underline",
                  }}
                >
                  Manage my resumes
                </p>
              </div>
            )}

            {resumeOption === "upload" && (
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
                  Upload Resume (PDF only)
                </label>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setResume(e.target.files[0])}
                  style={{
                    width: "100%",
                    background: t.input,
                    border: "1px solid " + t.inputBorder,
                    borderRadius: "8px",
                    padding: "10px",
                    fontSize: "14px",
                    color: t.inputText,
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}

            <button
              onClick={handleApply}
              disabled={applying}
              style={{
                width: "100%",
                background: applying ? "#93c5fd" : "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "12px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: applying ? "not-allowed" : "pointer",
              }}
            >
              {applying ? "Submitting..." : "Apply Now"}
            </button>
          </div>
        )}

        {!user && (
          <div
            style={{
              background: t.cardBg,
              border: "1px solid " + t.border,
              borderRadius: "12px",
              padding: "24px",
              textAlign: "center",
            }}
          >
            <p style={{ color: t.muted, marginBottom: "16px" }}>
              Please login to apply for this job
            </p>
            <button
              onClick={() => navigate("/login")}
              style={{
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Login to Apply
            </button>
          </div>
        )}
      </div>
    </div>
  );
};;

export default JobDetail;
