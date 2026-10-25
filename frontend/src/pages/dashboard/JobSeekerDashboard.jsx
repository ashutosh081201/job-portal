import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { getThemeStyles } from "../../utils/theme";
import { useIsMobile } from "../../hooks/useIsMobile";

const STATUS_OPTIONS = [
  "all",
  "pending",
  "reviewed",
  "shortlisted",
  "rejected",
];
const APPS_PER_PAGE = 8;

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  t,
  isMobile,
}) => {
  if (totalPages <= 1) return null;
  const getPageNumbers = () => {
    const pages = [];
    const delta = isMobile ? 1 : 2;
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    )
      pages.push(i);
    if (currentPage - delta > 2) pages.unshift("...");
    if (currentPage + delta < totalPages - 1) pages.push("...");
    pages.unshift(1);
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };
  const btnBase = {
    minWidth: "34px",
    height: "34px",
    border: "1px solid " + t.border,
    borderRadius: "8px",
    fontSize: "13px",
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
        gap: "6px",
        marginTop: "24px",
        flexWrap: "wrap",
      }}
    >
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{
          ...btnBase,
          background: t.cardBg,
          color: t.muted,
          opacity: currentPage === 1 ? 0.4 : 1,
          cursor: currentPage === 1 ? "not-allowed" : "pointer",
        }}
      >
        Prev
      </button>
      {getPageNumbers().map((page, i) =>
        page === "..." ? (
          <span
            key={"dots-" + i}
            style={{ color: t.muted, fontSize: "14px", padding: "0 2px" }}
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={{
              ...btnBase,
              background: page === currentPage ? "#3b82f6" : t.cardBg,
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
          background: t.cardBg,
          color: t.muted,
          opacity: currentPage === totalPages ? 0.4 : 1,
          cursor: currentPage === totalPages ? "not-allowed" : "pointer",
        }}
      >
        Next
      </button>
    </div>
  );
};

const JobSeekerDashboard = () => {
  const { isDark } = useTheme();
  const t = getThemeStyles(isDark);
  const isMobile = useIsMobile(640);

  const [activeTab, setActiveTab] = useState("applications");
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [statusCounts, setStatusCounts] = useState({
    all: 0,
    pending: 0,
    reviewed: 0,
    shortlisted: 0,
    rejected: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalApps, setTotalApps] = useState(0);

  const [savedJobs, setSavedJobs] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [savedPage, setSavedPage] = useState(1);
  const [savedTotalPages, setSavedTotalPages] = useState(1);
  const [savedTotal, setSavedTotal] = useState(0);

  const fetchMyApplications = async (page = 1, status = "all") => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", APPS_PER_PAGE);
      if (status && status !== "all") params.append("status", status);
      const res = await api.get("/applications/my?" + params.toString());
      const valid = res.data.applications.filter((app) => app.jobId !== null);
      setApplications(valid);
      setCurrentPage(res.data.currentPage || 1);
      setTotalPages(res.data.totalPages || 1);
      setTotalApps(res.data.totalApplications || 0);
      if (res.data.statusCounts) setStatusCounts(res.data.statusCounts);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
    setHasFetched(true);
  };

  const fetchSavedJobs = async (page = 1) => {
    setSavedLoading(true);
    try {
      const res = await api.get("/saved-jobs/my?page=" + page + "&limit=8");
      setSavedJobs(res.data.savedJobs || []);
      setSavedPage(res.data.currentPage || 1);
      setSavedTotalPages(res.data.totalPages || 1);
      setSavedTotal(res.data.total || 0);
    } catch (err) {
      console.error(err);
    }
    setSavedLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    fetchMyApplications(1, "all");
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    if (activeTab === "saved") fetchSavedJobs(1);
  }, [activeTab]);

  const handleUnsaveJob = async (jobId) => {
    try {
      await api.post("/saved-jobs/toggle", { jobId });
      fetchSavedJobs(savedPage);
    } catch (err) {
      alert(errorMessage(err, "Failed to remove saved job"));
    }
  };

  const handleStatusFilter = (status) => {
    setStatusFilter(status);
    setCurrentPage(1);
    fetchMyApplications(1, status);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchMyApplications(page, statusFilter);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleWithdraw = async (applicationId) => {
    if (!window.confirm("Are you sure you want to withdraw this application?"))
      return;
    setWithdrawing(applicationId);
    try {
      await api.delete("/applications/" + applicationId + "/withdraw");
      fetchMyApplications(currentPage, statusFilter);
    } catch (err) {
      alert(errorMessage(err, "Failed to withdraw application"));
    }
    setWithdrawing(null);
  };

  const getStatusStyle = (status) => {
    if (status === "pending")
      return { bg: isDark ? "#422006" : "#fef9c3", color: "#ca8a04" };
    if (status === "reviewed")
      return { bg: isDark ? "#1e3a5f" : "#dbeafe", color: "#3b82f6" };
    if (status === "shortlisted")
      return { bg: isDark ? "#14532d" : "#dcfce7", color: "#22c55e" };
    if (status === "rejected")
      return { bg: isDark ? "#2d1515" : "#fef2f2", color: "#ef4444" };
    return { bg: t.cardBg, color: t.muted };
  };

  const statusColor = {
    all: "#3b82f6",
    pending: "#ca8a04",
    reviewed: "#3b82f6",
    shortlisted: "#22c55e",
    rejected: "#ef4444",
  };
  const filterBtnStyle = (active, color) => ({
    padding: isMobile ? "5px 10px" : "6px 16px",
    borderRadius: "999px",
    border: "1px solid " + (active ? color : t.border),
    background: active ? (isDark ? "#1e293b" : "#f8fafc") : "none",
    color: active ? color : t.muted,
    fontSize: "12px",
    fontWeight: active ? "600" : "400",
    cursor: "pointer",
  });

  const trulyEmpty =
    hasFetched &&
    applications.length === 0 &&
    statusCounts.all === 0 &&
    statusFilter === "all";
  const filteredEmpty =
    hasFetched &&
    applications.length === 0 &&
    (statusCounts.all > 0 || statusFilter !== "all");

  if (loading && !hasFetched)
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
            marginBottom: "24px",
          }}
        >
          My Dashboard
        </h1>

        {/* ✅ Quick Links — now 3 columns on mobile (was 2), 5 on desktop */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr 1fr" : "repeat(5, 1fr)",
            gap: isMobile ? "10px" : "12px",
            marginBottom: "28px",
          }}
        >
          {[
            { to: "/jobs", icon: "🔍", label: "Browse Jobs", bg: "#3b82f6" },
            {
              to: "/resume/builder",
              icon: "📄",
              label: "Resume Builder",
              bg: "#22c55e",
            },
            { to: "/ats", icon: "📊", label: "ATS Checker", bg: "#a855f7" },
            {
              to: "/my-resumes",
              icon: "📁",
              label: "My Resumes",
              bg: "#f59e0b",
            },
            // ✅ NEW — shortcut: browse jobs to check ATS from job detail
            { to: "/jobs", icon: "🎯", label: "Job ATS Check", bg: "#0ea5e9" },
          ].map((item, i) => (
            <Link
              key={i}
              to={item.to}
              style={{
                background: item.bg,
                color: "#fff",
                textDecoration: "none",
                padding: isMobile ? "14px 6px" : "18px",
                borderRadius: "12px",
                textAlign: "center",
                display: "block",
              }}
            >
              <p
                style={{
                  fontSize: isMobile ? "22px" : "26px",
                  margin: "0 0 5px",
                }}
              >
                {item.icon}
              </p>
              <p
                style={{
                  fontWeight: "600",
                  margin: 0,
                  fontSize: isMobile ? "10px" : "12px",
                  lineHeight: "1.3",
                }}
              >
                {item.label}
              </p>
            </Link>
          ))}
        </div>


        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "0",
            marginBottom: "20px",
            borderBottom: "1px solid " + t.border,
          }}
        >
          <button
            onClick={() => setActiveTab("applications")}
            style={{
              padding: "10px 20px",
              border: "none",
              background: "none",
              color: activeTab === "applications" ? "#3b82f6" : t.muted,
              fontWeight: activeTab === "applications" ? "700" : "400",
              fontSize: "14px",
              cursor: "pointer",
              borderBottom:
                activeTab === "applications"
                  ? "2px solid #3b82f6"
                  : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            My Applications{" "}
            {statusCounts.all > 0 && "(" + statusCounts.all + ")"}
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            style={{
              padding: "10px 20px",
              border: "none",
              background: "none",
              color: activeTab === "saved" ? "#3b82f6" : t.muted,
              fontWeight: activeTab === "saved" ? "700" : "400",
              fontSize: "14px",
              cursor: "pointer",
              borderBottom:
                activeTab === "saved"
                  ? "2px solid #3b82f6"
                  : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            Saved Jobs {savedTotal > 0 && "(" + savedTotal + ")"}
          </button>
        </div>

        {/* Applications Tab */}
        {activeTab === "applications" && (
          <>
            {statusCounts.all > 0 && (
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "6px",
                  marginBottom: "16px",
                }}
              >
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusFilter(s)}
                    style={filterBtnStyle(statusFilter === s, statusColor[s])}
                  >
                    {s === "all"
                      ? "All"
                      : s.charAt(0).toUpperCase() + s.slice(1)}
                    <span style={{ marginLeft: "4px", opacity: 0.7 }}>
                      ({statusCounts[s] || 0})
                    </span>
                  </button>
                ))}
              </div>
            )}

            {trulyEmpty && (
              <div
                style={{
                  background: t.cardBg,
                  border: "1px solid " + t.border,
                  borderRadius: "12px",
                  padding: "40px",
                  textAlign: "center",
                }}
              >
                <p style={{ color: t.muted, marginBottom: "16px" }}>
                  You have not applied to any jobs yet
                </p>
                <Link
                  to="/jobs"
                  style={{
                    background: "#3b82f6",
                    color: "#fff",
                    textDecoration: "none",
                    padding: "10px 24px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  Browse Jobs
                </Link>
              </div>
            )}

            {filteredEmpty && (
              <div
                style={{
                  background: t.cardBg,
                  border: "1px solid " + t.border,
                  borderRadius: "12px",
                  padding: "32px",
                  textAlign: "center",
                }}
              >
                <p style={{ color: t.muted, marginBottom: "12px" }}>
                  No {statusFilter === "all" ? "" : statusFilter} applications
                </p>
                {statusFilter !== "all" && (
                  <button
                    onClick={() => handleStatusFilter("all")}
                    style={{
                      background: "none",
                      border: "1px solid " + t.border,
                      borderRadius: "6px",
                      padding: "6px 16px",
                      color: t.muted,
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Show all
                  </button>
                )}
              </div>
            )}

            {applications.length > 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {applications.map((app) => {
                  const statusStyle = getStatusStyle(app.status);
                  return (
                    <div
                      key={app._id}
                      style={{
                        background: t.cardBg,
                        border: "1px solid " + t.border,
                        borderRadius: "12px",
                        padding: isMobile ? "16px" : "20px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{ flex: 1, minWidth: 0, marginRight: "10px" }}
                        >
                          <h3
                            style={{
                              fontSize: "16px",
                              fontWeight: "600",
                              color: t.text,
                              margin: "0 0 4px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {app.jobId?.title || "Job no longer available"}
                          </h3>
                          <p
                            style={{
                              color: t.muted,
                              fontSize: "14px",
                              margin: "0 0 2px",
                            }}
                          >
                            {app.jobId?.company}
                            {app.jobId?.location
                              ? " • " + app.jobId.location
                              : ""}
                          </p>
                          {app.jobId?.salary && (
                            <p
                              style={{
                                color: "#22c55e",
                                fontSize: "13px",
                                margin: "0 0 4px",
                              }}
                            >
                              {app.jobId.salary}
                            </p>
                          )}
                          <p
                            style={{
                              color: t.muted,
                              fontSize: "12px",
                              margin: 0,
                            }}
                          >
                            Applied:{" "}
                            {new Date(app.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          style={{
                            background: statusStyle.bg,
                            color: statusStyle.color,
                            padding: "4px 10px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: "600",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                          }}
                        >
                          {app.status}
                        </span>
                      </div>
                      <div
                        style={{
                          marginTop: "12px",
                          display: "flex",
                          gap: "12px",
                          alignItems: "center",
                        }}
                      >
                        {app.jobId?._id ? (
                          <Link
                            to={"/jobs/" + app.jobId._id}
                            style={{
                              color: "#3b82f6",
                              fontSize: "13px",
                              textDecoration: "none",
                            }}
                          >
                            View Job
                          </Link>
                        ) : (
                          <p
                            style={{
                              color: t.muted,
                              fontSize: "13px",
                              margin: 0,
                            }}
                          >
                            Job removed
                          </p>
                        )}
                        {app.status === "pending" && (
                          <button
                            onClick={() => handleWithdraw(app._id)}
                            disabled={withdrawing === app._id}
                            style={{
                              background: "none",
                              border:
                                "1px solid " + (isDark ? "#4b1515" : "#fecaca"),
                              borderRadius: "6px",
                              padding: "4px 12px",
                              color: "#ef4444",
                              fontSize: "12px",
                              cursor:
                                withdrawing === app._id
                                  ? "not-allowed"
                                  : "pointer",
                              opacity: withdrawing === app._id ? 0.5 : 1,
                            }}
                          >
                            {withdrawing === app._id
                              ? "Withdrawing..."
                              : "Withdraw"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              isDark={isDark}
              t={t}
              isMobile={isMobile}
            />
            {totalPages > 1 && (
              <p
                style={{
                  textAlign: "center",
                  color: t.muted,
                  fontSize: "12px",
                  marginTop: "8px",
                }}
              >
                Page {currentPage} of {totalPages} - {totalApps}{" "}
                {statusFilter !== "all" ? statusFilter : "total"}
              </p>
            )}
          </>
        )}

        {/* Saved Jobs Tab */}
        {activeTab === "saved" && (
          <>
            {savedLoading ? (
              <p
                style={{ color: t.muted, textAlign: "center", padding: "40px" }}
              >
                Loading saved jobs...
              </p>
            ) : savedJobs.length === 0 ? (
              <div
                style={{
                  background: t.cardBg,
                  border: "1px solid " + t.border,
                  borderRadius: "12px",
                  padding: "40px",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "32px", margin: "0 0 12px" }}>★</p>
                <p style={{ color: t.muted, marginBottom: "16px" }}>
                  No saved jobs yet
                </p>
                <Link
                  to="/jobs"
                  style={{
                    background: "#3b82f6",
                    color: "#fff",
                    textDecoration: "none",
                    padding: "10px 24px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  Browse Jobs
                </Link>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {savedJobs.map((saved) => {
                  const job = saved.jobId;
                  if (!job) return null;
                  const isClosed = job.status === "closed";
                  return (
                    <div
                      key={saved._id}
                      style={{
                        background: t.cardBg,
                        border:
                          "1px solid " +
                          (isClosed
                            ? isDark
                              ? "#4b1515"
                              : "#fecaca"
                            : t.border),
                        borderRadius: "12px",
                        padding: isMobile ? "16px" : "20px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                        }}
                      >
                        <div
                          style={{ flex: 1, minWidth: 0, marginRight: "10px" }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "4px",
                              flexWrap: "wrap",
                            }}
                          >
                            <h3
                              style={{
                                fontSize: "16px",
                                fontWeight: "600",
                                color: t.text,
                                margin: 0,
                              }}
                            >
                              {job.title}
                            </h3>
                            {isClosed && (
                              <span
                                style={{
                                  background: "#ef4444",
                                  color: "#fff",
                                  fontSize: "10px",
                                  fontWeight: "700",
                                  padding: "2px 8px",
                                  borderRadius: "999px",
                                }}
                              >
                                CLOSED
                              </span>
                            )}
                          </div>
                          <p
                            style={{
                              color: t.muted,
                              fontSize: "14px",
                              margin: "0 0 2px",
                            }}
                          >
                            {job.company} • {job.location}
                          </p>
                          {job.salary && job.salary !== "Not Disclosed" && (
                            <p
                              style={{
                                color: "#22c55e",
                                fontSize: "13px",
                                margin: "0 0 4px",
                              }}
                            >
                              {job.salary}
                            </p>
                          )}
                          <p
                            style={{
                              color: t.muted,
                              fontSize: "12px",
                              margin: 0,
                            }}
                          >
                            Saved{" "}
                            {new Date(saved.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: "12px",
                          display: "flex",
                          gap: "10px",
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <Link
                          to={"/jobs/" + job._id}
                          style={{
                            background: isClosed
                              ? isDark
                                ? "#1e293b"
                                : "#f1f5f9"
                              : "#3b82f6",
                            color: isClosed ? t.muted : "#fff",
                            textDecoration: "none",
                            padding: "7px 16px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: "600",
                            border: isClosed ? "1px solid " + t.border : "none",
                          }}
                        >
                          {isClosed ? "View" : "View Job"}
                        </Link>
                        {/* ✅ NEW — Check ATS directly from saved job */}
                        {!isClosed && (
                          <Link
                            to={"/jobs/" + job._id}
                            style={{
                              background: "none",
                              border: "1px solid #a855f7",
                              borderRadius: "8px",
                              padding: "7px 16px",
                              color: "#a855f7",
                              textDecoration: "none",
                              fontSize: "13px",
                              fontWeight: "500",
                            }}
                          >
                            Check ATS
                          </Link>
                        )}
                        <button
                          onClick={() => handleUnsaveJob(job._id)}
                          style={{
                            background: "none",
                            border: "1px solid " + t.border,
                            borderRadius: "8px",
                            padding: "7px 16px",
                            color: t.muted,
                            fontSize: "13px",
                            cursor: "pointer",
                          }}
                        >
                          Unsave
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {savedTotalPages > 1 && (
              <>
                <Pagination
                  currentPage={savedPage}
                  totalPages={savedTotalPages}
                  onPageChange={(page) => {
                    setSavedPage(page);
                    fetchSavedJobs(page);
                  }}
                  isDark={isDark}
                  t={t}
                  isMobile={isMobile}
                />
                <p
                  style={{
                    textAlign: "center",
                    color: t.muted,
                    fontSize: "12px",
                    marginTop: "8px",
                  }}
                >
                  Page {savedPage} of {savedTotalPages} - {savedTotal} saved
                  jobs
                </p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default JobSeekerDashboard;
