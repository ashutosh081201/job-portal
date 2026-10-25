import { useState, useEffect, useRef } from "react";
import api from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { getThemeStyles } from "../../utils/theme";
import { useIsMobile } from "../../hooks/useIsMobile";

const HISTORY_PER_PAGE = 5;

const Pagination = ({ currentPage, totalPages, onPageChange, t }) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage - 1 > 2) pages.unshift("...");
    if (currentPage + 1 < totalPages - 1) pages.push("...");
    pages.unshift(1);
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };

  const btnBase = {
    minWidth: "30px",
    height: "30px",
    border: "1px solid " + t.border,
    borderRadius: "6px",
    fontSize: "12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "500",
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "4px",
        marginTop: "12px",
        flexWrap: "wrap",
      }}
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          ...btnBase,
          background: t.bg,
          color: t.muted,
          opacity: currentPage === 1 ? 0.4 : 1,
          cursor: currentPage === 1 ? "not-allowed" : "pointer",
        }}
      >
        ←
      </button>
      {getPageNumbers().map((page, i) =>
        page === "..." ? (
          <span key={"dots-" + i} style={{ color: t.muted, fontSize: "12px" }}>
            …
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={{
              ...btnBase,
              background: page === currentPage ? "#3b82f6" : t.bg,
              color: page === currentPage ? "#fff" : t.muted,
              border:
                page === currentPage
                  ? "1px solid #3b82f6"
                  : "1px solid " + t.border,
              fontWeight: page === currentPage ? "700" : "500",
            }}
          >
            {page}
          </button>
        ),
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{
          ...btnBase,
          background: t.bg,
          color: t.muted,
          opacity: currentPage === totalPages ? 0.4 : 1,
          cursor: currentPage === totalPages ? "not-allowed" : "pointer",
        }}
      >
        →
      </button>
    </div>
  );
};

const ATSChecker = () => {
  const { isDark } = useTheme();
  const t = getThemeStyles(isDark);
  const isMobile = useIsMobile(640);
  const resultRef = useRef(null);

  const [jobDescription, setJobDescription] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingPast, setViewingPast] = useState(false);
  const [pastResumeName, setPastResumeName] = useState("");
  // ✅ NEW — tracks context for viewing past result (manual or job-linked)
  const [pastJobTitle, setPastJobTitle] = useState("");
  const [pastCompany, setPastCompany] = useState("");

  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  // ✅ NEW — job-linked history
  const [jobHistory, setJobHistory] = useState([]);
  const [showJobHistory, setShowJobHistory] = useState(false);
  const [jobHistoryPage, setJobHistoryPage] = useState(1);
  const [jobHistoryTotalPages, setJobHistoryTotalPages] = useState(1);
  const [jobHistoryTotal, setJobHistoryTotal] = useState(0);

  const fetchResumes = async () => {
    try {
      const res = await api.get("/resume/all");
      if (res.data.resumes?.length > 0) {
        setResumes(res.data.resumes);
        setSelectedResumeId(res.data.resumes[0]._id);
      }
    } catch {
      setResumes([]);
    }
  };

  const fetchHistory = async (page = 1) => {
    try {
      const res = await api.get(
        "/ats/history?page=" + page + "&limit=" + HISTORY_PER_PAGE,
      );
      setHistory(res.data.history);
      setHistoryPage(res.data.currentPage || 1);
      setHistoryTotalPages(res.data.totalPages || 1);
      setHistoryTotal(res.data.totalHistory || 0);
    } catch (err) {
      console.error(err);
    }
  };

  // ✅ NEW — fetch job-linked ATS history
  const fetchJobHistory = async (page = 1) => {
    try {
      const res = await api.get(
        "/ats/history/jobs?page=" + page + "&limit=" + HISTORY_PER_PAGE,
      );
      setJobHistory(res.data.history);
      setJobHistoryPage(res.data.currentPage || 1);
      setJobHistoryTotalPages(res.data.totalPages || 1);
      setJobHistoryTotal(res.data.totalHistory || 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    fetchResumes();
    fetchHistory(1);
    fetchJobHistory(1);
  }, []);

  const handleCheck = async () => {
    if (!jobDescription.trim()) {
      setError("Please paste a job description");
      return;
    }
    if (jobDescription.trim().split(" ").length < 20) {
      setError(
        "Please paste a complete job description (at least 20 words) for accurate results",
      );
      return;
    }
    if (!selectedResumeId) {
      setError("Please build and save a resume first");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setViewingPast(false);
    setPastJobTitle("");
    setPastCompany("");
    try {
      const res = await api.post("/ats/check", {
        jobDescription,
        resumeId: selectedResumeId,
      });
      setResult(res.data.data);
      setHistoryPage(1);
      fetchHistory(1);
      setTimeout(
        () =>
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        100,
      );
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
    setLoading(false);
  };

  const handleHistoryClick = (h) => {
    setResult({
      score: h.score,
      matchedKeywords: h.feedback?.matchedKeywords || [],
      missingKeywords: h.feedback?.missingKeywords || [],
      strengths: h.feedback?.strengths || [],
      improvements: h.feedback?.improvements || [],
      summary: h.feedback?.summary || "",
    });
    setJobDescription(h.jobDescription);
    setPastResumeName(h.resumeName || "My Resume");
    // ✅ set job context if this was a job-linked check
    setPastJobTitle(h.jobTitle || "");
    setPastCompany(h.companyName || "");
    setViewingPast(true);
    setShowHistory(false);
    setShowJobHistory(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClearPast = () => {
    setResult(null);
    setViewingPast(false);
    setJobDescription("");
    setError("");
    setPastResumeName("");
    setPastJobTitle("");
    setPastCompany("");
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

  const wordCount =
    jobDescription.trim() === ""
      ? 0
      : jobDescription
          .trim()
          .split(" ")
          .filter((w) => w).length;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: t.bg,
        padding: isMobile ? "20px 16px" : "32px 24px",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1
          style={{
            fontSize: isMobile ? "22px" : "28px",
            fontWeight: "700",
            color: t.text,
            margin: "0 0 8px",
          }}
        >
          ATS Score Checker
        </h1>
        <p style={{ color: t.muted, marginBottom: "28px", fontSize: "15px" }}>
          Check how well your resume matches a job description
        </p>

        {/* Viewing past result */}
        {viewingPast && result && (
          <p style={{ color: t.muted, fontSize: "14px", marginBottom: "20px" }}>
            {pastJobTitle ? (
              <>
                Showing past result for{" "}
                <strong style={{ color: t.text }}>{pastJobTitle}</strong> at{" "}
                <strong style={{ color: t.text }}>{pastCompany}</strong> —
                Resume:{" "}
                <strong style={{ color: t.text }}>{pastResumeName}</strong>.
              </>
            ) : (
              <>
                Showing a past result for{" "}
                <strong style={{ color: t.text }}>{pastResumeName}</strong>.
              </>
            )}{" "}
            <button
              onClick={handleClearPast}
              style={{
                background: "none",
                border: "none",
                color: "#3b82f6",
                fontSize: "14px",
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              Clear
            </button>
          </p>
        )}

        {/* No Resume Warning */}
        {!viewingPast && resumes.length === 0 && (
          <div
            style={{
              background: isDark ? "#422006" : "#fffbeb",
              border: "1px solid #f59e0b",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "24px",
            }}
          >
            <p
              style={{ color: "#f59e0b", fontWeight: "600", margin: "0 0 4px" }}
            >
              No resume found
            </p>
            <p style={{ color: t.muted, fontSize: "14px", margin: 0 }}>
              Please build your resume first.{" "}
              <a href="/resume/builder" style={{ color: "#3b82f6" }}>
                Build Resume →
              </a>
            </p>
          </div>
        )}

        {/* Resume Selector */}
        {!viewingPast && resumes.length > 0 && (
          <div
            style={{
              background: t.cardBg,
              border: "1px solid " + t.border,
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "20px",
            }}
          >
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "600",
                color: t.text,
                marginBottom: "12px",
              }}
            >
              Select Resume to Check
            </label>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "8px" }}
            >
              {resumes.map((r, i) => (
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
                      (selectedResumeId === r._id ? "#22c55e" : t.inputBorder),
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
                        color: selectedResumeId === r._id ? "#22c55e" : t.text,
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
                            fontWeight: "500",
                          }}
                        >
                          Latest
                        </span>
                      )}
                    </p>
                    <p style={{ color: t.muted, fontSize: "12px", margin: 0 }}>
                      {r.personalInfo?.name} • Updated{" "}
                      {new Date(r.updatedAt).toLocaleDateString()}
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
          </div>
        )}

        {/* Job Description Input */}
        <div
          style={{
            background: t.cardBg,
            border: "1px solid " + t.border,
            borderRadius: "12px",
            padding: "24px",
            marginBottom: "24px",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              color: t.label,
              marginBottom: "8px",
            }}
          >
            Paste Job Description
            {viewingPast && (
              <span
                style={{
                  marginLeft: "8px",
                  fontSize: "12px",
                  color: t.muted,
                  fontWeight: "400",
                }}
              >
                (loaded from past result)
              </span>
            )}
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => {
              setJobDescription(e.target.value);
              if (viewingPast) {
                setViewingPast(false);
                setResult(null);
              }
            }}
            rows={isMobile ? 6 : 8}
            style={{
              width: "100%",
              background: t.input,
              border: "1px solid " + t.inputBorder,
              borderRadius: "8px",
              padding: "12px",
              fontSize: "14px",
              color: t.inputText,
              outline: "none",
              resize: "vertical",
              boxSizing: "border-box",
            }}
            placeholder="Paste the full job description here (minimum 20 words)..."
          />
          <p
            style={{
              fontSize: "12px",
              color: wordCount < 20 ? "#f59e0b" : "#22c55e",
              margin: "6px 0 0",
              textAlign: "right",
            }}
          >
            {wordCount === 0
              ? "0 words"
              : wordCount +
                " words " +
                (wordCount < 20 ? "(minimum 20 required)" : "✓")}
          </p>
          {error && (
            <div
              style={{
                background: isDark ? "#2d1515" : "#fef2f2",
                border: "1px solid #f87171",
                borderRadius: "8px",
                padding: "10px 12px",
                marginTop: "12px",
                color: "#ef4444",
                fontSize: "14px",
              }}
            >
              {error}
            </div>
          )}
          <button
            onClick={handleCheck}
            disabled={loading || resumes.length === 0}
            style={{
              marginTop: "16px",
              width: "100%",
              background:
                loading || resumes.length === 0 ? "#93c5fd" : "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "12px",
              fontSize: "15px",
              fontWeight: "600",
              cursor:
                loading || resumes.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Analyzing..." : "Check ATS Score"}
          </button>
        </div>

        {/* Results */}
        <div ref={resultRef}>
          {result && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                marginBottom: "24px",
              }}
            >
              <div
                style={{
                  background: getScoreBg(result.score),
                  border: "1px solid " + getScoreColor(result.score),
                  borderRadius: "12px",
                  padding: "32px",
                  textAlign: "center",
                }}
              >
                {viewingPast && (
                  <p
                    style={{
                      color: t.muted,
                      fontSize: "12px",
                      margin: "0 0 8px",
                    }}
                  >
                    Past result
                  </p>
                )}
                <p
                  style={{
                    color: t.muted,
                    fontSize: "14px",
                    margin: "0 0 8px",
                  }}
                >
                  Your ATS Score
                </p>
                <p
                  style={{
                    fontSize: "72px",
                    fontWeight: "700",
                    color: getScoreColor(result.score),
                    margin: "0 0 4px",
                    lineHeight: 1,
                  }}
                >
                  {result.score}
                </p>
                <p
                  style={{
                    color: t.muted,
                    fontSize: "14px",
                    margin: "0 0 16px",
                  }}
                >
                  out of 100
                </p>
                <p
                  style={{
                    color: t.subtext,
                    fontSize: "14px",
                    margin: 0,
                    lineHeight: "1.6",
                  }}
                >
                  {result.summary}
                </p>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    background: t.cardBg,
                    border: "1px solid " + t.border,
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <h3
                    style={{
                      color: "#22c55e",
                      fontWeight: "600",
                      margin: "0 0 14px",
                      fontSize: "15px",
                    }}
                  >
                    Matched ({result.matchedKeywords.length})
                  </h3>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {result.matchedKeywords.map((kw, i) => (
                      <span
                        key={i}
                        style={{
                          background: isDark ? "#14532d" : "#dcfce7",
                          color: "#22c55e",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
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
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <h3
                    style={{
                      color: "#ef4444",
                      fontWeight: "600",
                      margin: "0 0 14px",
                      fontSize: "15px",
                    }}
                  >
                    Missing ({result.missingKeywords.length})
                  </h3>
                  <div
                    style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}
                  >
                    {result.missingKeywords.map((kw, i) => (
                      <span
                        key={i}
                        style={{
                          background: isDark ? "#2d1515" : "#fef2f2",
                          color: "#ef4444",
                          padding: "4px 10px",
                          borderRadius: "999px",
                          fontSize: "12px",
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
                  gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div
                  style={{
                    background: t.cardBg,
                    border: "1px solid " + t.border,
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <h3
                    style={{
                      color: t.text,
                      fontWeight: "600",
                      margin: "0 0 14px",
                      fontSize: "15px",
                    }}
                  >
                    Strengths
                  </h3>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {result.strengths.map((s, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          gap: "8px",
                          color: t.subtext,
                          fontSize: "13px",
                          marginBottom: "8px",
                          lineHeight: "1.5",
                        }}
                      >
                        <span style={{ color: "#22c55e", flexShrink: 0 }}>
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
                    borderRadius: "12px",
                    padding: "20px",
                  }}
                >
                  <h3
                    style={{
                      color: t.text,
                      fontWeight: "600",
                      margin: "0 0 14px",
                      fontSize: "15px",
                    }}
                  >
                    Improvements
                  </h3>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                    {result.improvements.map((imp, i) => (
                      <li
                        key={i}
                        style={{
                          display: "flex",
                          gap: "8px",
                          color: t.subtext,
                          fontSize: "13px",
                          marginBottom: "8px",
                          lineHeight: "1.5",
                        }}
                      >
                        <span style={{ color: "#3b82f6", flexShrink: 0 }}>
                          •
                        </span>
                        {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ✅ NEW — Job-linked ATS History */}
        {jobHistoryTotal > 0 && (
          <div
            style={{
              background: t.cardBg,
              border: "1px solid " + t.border,
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "16px",
            }}
          >
            <button
              onClick={() => setShowJobHistory(!showJobHistory)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span
                style={{ fontSize: "15px", fontWeight: "600", color: t.text }}
              >
                JobVerse Job Checks
                <span
                  style={{
                    color: t.muted,
                    fontWeight: "400",
                    fontSize: "13px",
                    marginLeft: "6px",
                  }}
                >
                  ({jobHistoryTotal} total)
                </span>
              </span>
              <span style={{ color: t.muted }}>
                {showJobHistory ? "▲" : "▼"}
              </span>
            </button>

            {showJobHistory && (
              <>
                <p
                  style={{
                    color: t.muted,
                    fontSize: "12px",
                    margin: "12px 0 8px",
                  }}
                >
                  Checks done directly from job listings — click any to view
                  full breakdown
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {jobHistory.map((h, i) => (
                    <div
                      key={i}
                      onClick={() => handleHistoryClick(h)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: t.bg,
                        border: "1px solid " + t.border,
                        borderRadius: "8px",
                        padding: "12px 16px",
                        cursor: "pointer",
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor = "#a855f7")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.borderColor = t.border)
                      }
                    >
                      <div
                        style={{ flex: 1, minWidth: 0, marginRight: "12px" }}
                      >
                        <p
                          style={{
                            color: t.text,
                            fontSize: "13px",
                            fontWeight: "600",
                            margin: "0 0 2px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h.jobTitle || "Unknown Job"} —{" "}
                          {h.companyName || "Unknown Company"}
                        </p>
                        <p
                          style={{
                            color: t.muted,
                            fontSize: "12px",
                            margin: 0,
                          }}
                        >
                          {new Date(h.createdAt).toLocaleDateString()}
                          {h.resumeName && (
                            <span
                              style={{ marginLeft: "8px", fontSize: "11px" }}
                            >
                              · {h.resumeName}
                            </span>
                          )}
                          <span
                            style={{
                              marginLeft: "8px",
                              color: "#a855f7",
                              fontSize: "11px",
                            }}
                          >
                            Tap to view →
                          </span>
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: "22px",
                          fontWeight: "700",
                          color: getScoreColor(h.score),
                          flexShrink: 0,
                        }}
                      >
                        {h.score}
                      </span>
                    </div>
                  ))}
                </div>
                <Pagination
                  currentPage={jobHistoryPage}
                  totalPages={jobHistoryTotalPages}
                  onPageChange={(page) => fetchJobHistory(page)}
                  isDark={isDark}
                  t={t}
                />
                {jobHistoryTotalPages > 1 && (
                  <p
                    style={{
                      textAlign: "center",
                      color: t.muted,
                      fontSize: "11px",
                      marginTop: "6px",
                    }}
                  >
                    Page {jobHistoryPage} of {jobHistoryTotalPages} ·{" "}
                    {jobHistoryTotal} total checks
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Manual JD History */}
        {historyTotal > 0 && (
          <div
            style={{
              background: t.cardBg,
              border: "1px solid " + t.border,
              borderRadius: "12px",
              padding: "20px",
            }}
          >
            <button
              onClick={() => setShowHistory(!showHistory)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <span
                style={{ fontSize: "15px", fontWeight: "600", color: t.text }}
              >
                Manual JD Checks
                <span
                  style={{
                    color: t.muted,
                    fontWeight: "400",
                    fontSize: "13px",
                    marginLeft: "6px",
                  }}
                >
                  ({historyTotal} total)
                </span>
              </span>
              <span style={{ color: t.muted }}>{showHistory ? "▲" : "▼"}</span>
            </button>

            {showHistory && (
              <>
                <p
                  style={{
                    color: t.muted,
                    fontSize: "12px",
                    margin: "12px 0 8px",
                  }}
                >
                  Checks done by pasting a job description manually — click any
                  to view full breakdown
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {history.map((h, i) => (
                    <div
                      key={i}
                      onClick={() => handleHistoryClick(h)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        background: t.bg,
                        border: "1px solid " + t.border,
                        borderRadius: "8px",
                        padding: "12px 16px",
                        cursor: "pointer",
                        transition: "border-color 0.15s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.borderColor = "#3b82f6")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.borderColor = t.border)
                      }
                    >
                      <div
                        style={{ flex: 1, minWidth: 0, marginRight: "12px" }}
                      >
                        <p
                          style={{
                            color: t.subtext,
                            fontSize: "13px",
                            margin: "0 0 2px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {h.jobDescription.substring(0, isMobile ? 35 : 60)}...
                        </p>
                        <p
                          style={{
                            color: t.muted,
                            fontSize: "12px",
                            margin: 0,
                          }}
                        >
                          {new Date(h.createdAt).toLocaleDateString()}
                          {h.resumeName && (
                            <span
                              style={{
                                marginLeft: "8px",
                                color: t.muted,
                                fontSize: "11px",
                              }}
                            >
                              · {h.resumeName}
                            </span>
                          )}
                          <span
                            style={{
                              marginLeft: "8px",
                              color: "#3b82f6",
                              fontSize: "11px",
                            }}
                          >
                            Tap to view →
                          </span>
                        </p>
                      </div>
                      <span
                        style={{
                          fontSize: "22px",
                          fontWeight: "700",
                          color: getScoreColor(h.score),
                          flexShrink: 0,
                        }}
                      >
                        {h.score}
                      </span>
                    </div>
                  ))}
                </div>
                <Pagination
                  currentPage={historyPage}
                  totalPages={historyTotalPages}
                  onPageChange={(page) => fetchHistory(page)}
                  isDark={isDark}
                  t={t}
                />
                {historyTotalPages > 1 && (
                  <p
                    style={{
                      textAlign: "center",
                      color: t.muted,
                      fontSize: "11px",
                      marginTop: "6px",
                    }}
                  >
                    Page {historyPage} of {historyTotalPages} · {historyTotal}{" "}
                    total checks
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ATSChecker;
