import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { getThemeStyles } from "../../utils/theme";
import { useIsMobile } from "../../hooks/useIsMobile";
import { formatDeadline } from "../../utils/jobs";

const STATUS_OPTIONS = ["all", "pending", "reviewed", "shortlisted", "rejected"];
const JOBS_PER_PAGE = 8;
const APPS_PER_PAGE = 8;

const Pagination = ({ currentPage, totalPages, onPageChange, t }) => {
  if (totalPages <= 1) return null;
  const getPageNumbers = () => {
    const pages = [];
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage - 1 > 2) pages.unshift("...");
    if (currentPage + 1 < totalPages - 1) pages.push("...");
    pages.unshift(1);
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };
  const btnBase = { minWidth: "30px", height: "30px", border: "1px solid " + t.border, borderRadius: "6px", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "500" };
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "4px", marginTop: "16px", flexWrap: "wrap" }}>
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} style={{ ...btnBase, background: t.cardBg, color: t.muted, opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>Prev</button>
      {getPageNumbers().map((page, i) =>
        page === "..." ? <span key={"dots-" + i} style={{ color: t.muted, fontSize: "12px", padding: "0 2px" }}>...</span>
        : <button key={page} onClick={() => onPageChange(page)} style={{ ...btnBase, background: page === currentPage ? "#3b82f6" : t.cardBg, color: page === currentPage ? "#fff" : t.muted, border: page === currentPage ? "1px solid #3b82f6" : "1px solid " + t.border, fontWeight: page === currentPage ? "700" : "500" }}>{page}</button>
      )}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} style={{ ...btnBase, background: t.cardBg, color: t.muted, opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>Next</button>
    </div>
  );
};

const RecruiterDashboard = () => {
  const { isDark } = useTheme();
  const t = getThemeStyles(isDark);
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const applicantsPanelRef = useRef(null);

  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyWithApplicants, setOnlyWithApplicants] = useState(false);
  const [applicantStatusFilter, setApplicantStatusFilter] = useState("all");
  const [jobStatusFilter, setJobStatusFilter] = useState("all");

  const [jobCurrentPage, setJobCurrentPage] = useState(1);
  const [jobTotalPages, setJobTotalPages] = useState(1);
  const [jobTotalCount, setJobTotalCount] = useState(0);
  const [totalJobsPosted, setTotalJobsPosted] = useState(0);

  const [appCurrentPage, setAppCurrentPage] = useState(1);
  const [appTotalPages, setAppTotalPages] = useState(1);
  const [appTotalCount, setAppTotalCount] = useState(0);

  const fetchMyJobs = async (page = 1, withApplicants = false, statusFilter = "all", isInitial = false) => {
    setLoading(true);
    try {
      let url = "/jobs/recruiter/myjobs?page=" + page + "&limit=" + JOBS_PER_PAGE;
      if (withApplicants) url += "&hasApplicants=true";
      if (statusFilter && statusFilter !== "all") url += "&status=" + statusFilter;
      const res = await api.get(url);
      setJobs(res.data.jobs);
      setJobCurrentPage(res.data.currentPage || 1);
      setJobTotalPages(res.data.totalPages || 1);
      setJobTotalCount(res.data.totalJobs || 0);
      if (isInitial) setTotalJobsPosted(res.data.totalJobs || 0);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
  useEffect(() => { fetchMyJobs(1, false, "all", true); }, []);

  const handleApplicantsToggle = () => {
    const newVal = !onlyWithApplicants;
    setOnlyWithApplicants(newVal);
    setSelectedJob(null);
    setApplications([]);
    setJobCurrentPage(1);
    fetchMyJobs(1, newVal, jobStatusFilter, false);
  };

  const handleStatusFilterChange = (status) => {
    setJobStatusFilter(status);
    setSelectedJob(null);
    setApplications([]);
    setJobCurrentPage(1);
    fetchMyJobs(1, onlyWithApplicants, status, false);
  };

  const handleJobPageChange = (page) => {
    setSelectedJob(null);
    setApplications([]);
    fetchMyJobs(page, onlyWithApplicants, jobStatusFilter, false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleJobStatus = async (jobId) => {
    try {
      await api.put("/jobs/" + jobId + "/status");
      fetchMyJobs(jobCurrentPage, onlyWithApplicants, jobStatusFilter, false);
      if (selectedJob === jobId) { setSelectedJob(null); setApplications([]); }
    } catch (err) { alert(errorMessage(err, "Failed to update job status")); }
  };

  const fetchApplications = async (jobId, page = 1) => {
    try {
      const res = await api.get("/applications/job/" + jobId + "?page=" + page + "&limit=" + APPS_PER_PAGE);
      setApplications(res.data.applications);
      setSelectedJob(jobId);
      setApplicantStatusFilter("all");
      setAppCurrentPage(res.data.currentPage || 1);
      setAppTotalPages(res.data.totalPages || 1);
      setAppTotalCount(res.data.totalApplications || 0);
      if (isMobile) {
        setTimeout(() => { applicantsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, 100);
      }
    } catch (err) { console.error(err); }
  };

  const handleAppPageChange = (page) => { setApplicantStatusFilter("all"); fetchApplications(selectedJob, page); };

  const handleStatusChange = async (applicationId, status) => {
    try {
      await api.put("/applications/" + applicationId + "/status", { status });
      fetchApplications(selectedJob, appCurrentPage);
    } catch (err) { alert(errorMessage(err, "Failed to update application status")); }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm("Delete this job? All applications will also be deleted.")) return;
    try {
      await api.delete("/jobs/" + jobId);
      if (selectedJob === jobId) { setSelectedJob(null); setApplications([]); }
      fetchMyJobs(jobCurrentPage, onlyWithApplicants, jobStatusFilter, !onlyWithApplicants && jobStatusFilter === "all");
    } catch (err) { alert(errorMessage(err, "Failed to delete job")); }
  };

  const getStatusColor = (status) => {
    if (status === "pending") return { bg: isDark ? "#422006" : "#fef9c3", color: "#ca8a04" };
    if (status === "reviewed") return { bg: isDark ? "#1e3a5f" : "#dbeafe", color: "#3b82f6" };
    if (status === "shortlisted") return { bg: isDark ? "#14532d" : "#dcfce7", color: "#22c55e" };
    if (status === "rejected") return { bg: isDark ? "#2d1515" : "#fef2f2", color: "#ef4444" };
    return { bg: t.cardBg, color: t.muted };
  };

  const viewResume = (resumeUrl) => {
    if (!resumeUrl) { alert("No resume attached"); return; }
    const match = resumeUrl.match(/resume\/view\/([a-f0-9]{24})/);
    if (match) { navigate("/resume/view/" + match[1]); }
    else { navigate("/pdf-viewer?url=" + encodeURIComponent(resumeUrl)); }
  };

  const filteredJobs = jobs.filter(job =>
    job.title.toLowerCase().includes(search.toLowerCase()) ||
    job.company.toLowerCase().includes(search.toLowerCase())
  );

  const filteredApplicants = applicantStatusFilter === "all" ? applications : applications.filter(app => app.status === applicantStatusFilter);
  const statusColor = { all: "#3b82f6", pending: "#ca8a04", reviewed: "#3b82f6", shortlisted: "#22c55e", rejected: "#ef4444" };
  const filterBtnStyle = (active, color) => ({ padding: "5px 14px", borderRadius: "999px", border: "1px solid " + (active ? color : t.border), background: active ? (isDark ? "#1e293b" : "#f8fafc") : "none", color: active ? color : t.muted, fontSize: "12px", fontWeight: active ? "600" : "400", cursor: "pointer" });

  if (loading) return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: t.muted }}>Loading...</p>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: t.bg, padding: isMobile ? "20px 16px" : "32px 24px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isMobile ? "20px" : "32px" }}>
          <h1 style={{ fontSize: isMobile ? "20px" : "28px", fontWeight: "700", color: t.text, margin: 0 }}>Recruiter Dashboard</h1>
          <Link to="/post-job" style={{ background: "#3b82f6", color: "#fff", textDecoration: "none", padding: isMobile ? "8px 14px" : "10px 20px", borderRadius: "8px", fontSize: isMobile ? "13px" : "14px", fontWeight: "600" }}>+ Post Job</Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "24px" }}>

          {/* LEFT: Jobs */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", color: t.text, margin: 0 }}>
                My Posted Jobs
                {totalJobsPosted > 0 && <span style={{ color: t.muted, fontWeight: "400", fontSize: "13px", marginLeft: "6px" }}>({totalJobsPosted})</span>}
                {jobStatusFilter !== "all" && <span style={{ color: "#3b82f6", fontWeight: "400", fontSize: "12px", marginLeft: "6px" }}>- {jobTotalCount} {jobStatusFilter}</span>}
              </h2>
            </div>

            {/* Active/Closed/All filter */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
              {["all", "active", "closed"].map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusFilterChange(s)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: "999px",
                    border: "1px solid " + (jobStatusFilter === s ? (s === "closed" ? "#ef4444" : s === "active" ? "#22c55e" : "#3b82f6") : t.border),
                    background: jobStatusFilter === s ? (isDark ? "#1e293b" : "#f8fafc") : "none",
                    color: jobStatusFilter === s ? (s === "closed" ? "#ef4444" : s === "active" ? "#22c55e" : "#3b82f6") : t.muted,
                    fontSize: "12px", fontWeight: jobStatusFilter === s ? "600" : "400", cursor: "pointer"
                  }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>

            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search jobs..." style={{ width: "100%", background: t.input, border: "1px solid " + t.inputBorder, borderRadius: "8px", padding: "8px 12px", fontSize: "13px", color: t.inputText, outline: "none", boxSizing: "border-box", marginBottom: "10px" }} />

            <div onClick={handleApplicantsToggle} style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "14px", cursor: "pointer", background: onlyWithApplicants ? (isDark ? "#1e3a5f" : "#dbeafe") : t.cardBg, border: "1px solid " + (onlyWithApplicants ? "#3b82f6" : t.border), borderRadius: "999px", padding: "5px 14px" }}>
              <span style={{ width: "14px", height: "14px", borderRadius: "3px", background: onlyWithApplicants ? "#3b82f6" : "none", border: "2px solid " + (onlyWithApplicants ? "#3b82f6" : t.muted), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#fff", flexShrink: 0 }}>
                {onlyWithApplicants ? "✓" : ""}
              </span>
              <span style={{ fontSize: "12px", fontWeight: "500", color: onlyWithApplicants ? "#3b82f6" : t.muted }}>Has Applicants</span>
            </div>

            {filteredJobs.length === 0 ? (
              <div style={{ background: t.cardBg, border: "1px solid " + t.border, borderRadius: "12px", padding: "32px", textAlign: "center" }}>
                <p style={{ color: t.muted, marginBottom: "16px" }}>
                  {search ? "No jobs match your search" : onlyWithApplicants ? "No jobs with applicants yet" : jobStatusFilter !== "all" ? "No " + jobStatusFilter + " jobs" : "No jobs posted yet"}
                </p>
                {!search && !onlyWithApplicants && jobStatusFilter === "all" && (
                  <Link to="/post-job" style={{ background: "#3b82f6", color: "#fff", textDecoration: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: "600" }}>Post First Job</Link>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredJobs.map(job => (
                  <div key={job._id} onClick={() => fetchApplications(job._id, 1)} style={{ background: t.cardBg, border: "1px solid " + (selectedJob === job._id ? "#3b82f6" : job.status === "closed" ? (isDark ? "#4b1515" : "#fecaca") : t.border), borderRadius: "12px", padding: "16px", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
                          <h3 style={{ fontSize: "15px", fontWeight: "600", color: t.text, margin: 0 }}>{job.title}</h3>
                          {job.status === "closed" && <span style={{ background: "#ef4444", color: "#fff", fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "999px" }}>CLOSED</span>}
                        </div>
                        <p style={{ color: t.muted, fontSize: "13px", margin: "0 0 8px" }}>{job.company} - {job.location}</p>
                        <span style={{ background: (job.applicationCount || 0) > 0 ? (isDark ? "#14532d" : "#dcfce7") : (isDark ? "#1e293b" : "#f1f5f9"), color: (job.applicationCount || 0) > 0 ? "#22c55e" : t.muted, padding: "2px 10px", borderRadius: "999px", fontSize: "11px", fontWeight: "600" }}>
                          {job.applicationCount || 0} applicants
                        </span>
                        {job.deadline && (
                          <span style={{ marginLeft: "8px", fontSize: "11px", color: t.muted }}>
                            Deadline: {formatDeadline(job.deadline)}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "6px", marginLeft: "8px", flexDirection: "column", alignItems: "flex-end" }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={(e) => { e.stopPropagation(); navigate("/edit-job/" + job._id); }} style={{ background: "none", border: "1px solid " + t.border, borderRadius: "6px", padding: "4px 10px", color: t.muted, fontSize: "12px", cursor: "pointer" }}>Edit</button>
                          <button onClick={(e) => { e.stopPropagation(); handleDeleteJob(job._id); }} style={{ background: "none", border: "none", color: "#ef4444", fontSize: "13px", cursor: "pointer" }}>Delete</button>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleJobStatus(job._id); }}
                          style={{ background: job.status === "active" ? (isDark ? "#14532d" : "#f0fdf4") : (isDark ? "#2d1515" : "#fef2f2"), border: "1px solid " + (job.status === "active" ? "#22c55e" : "#f87171"), borderRadius: "6px", padding: "3px 10px", color: job.status === "active" ? "#22c55e" : "#ef4444", fontSize: "11px", fontWeight: "600", cursor: "pointer" }}
                        >
                          {job.status === "active" ? "Active" : "Closed"}
                        </button>
                      </div>
                    </div>
                    {job.skills?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                        {job.skills.map((skill, i) => <span key={i} style={{ background: isDark ? "#1e3a5f" : "#dbeafe", color: isDark ? "#60a5fa" : "#1d4ed8", padding: "2px 8px", borderRadius: "999px", fontSize: "11px" }}>{skill}</span>)}
                      </div>
                    )}
                    <p style={{ color: "#3b82f6", fontSize: "12px", margin: "8px 0 0" }}>{isMobile ? "Tap to view applicants" : "Click to view applicants"}</p>
                  </div>
                ))}
              </div>
            )}

            <Pagination currentPage={jobCurrentPage} totalPages={jobTotalPages} onPageChange={handleJobPageChange} isDark={isDark} t={t} />
            {jobTotalPages > 1 && <p style={{ textAlign: "center", color: t.muted, fontSize: "11px", marginTop: "6px" }}>Page {jobCurrentPage} of {jobTotalPages}</p>}
          </div>

          {/* RIGHT: Applicants */}
          <div ref={applicantsPanelRef}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "600", color: t.text, margin: 0 }}>
                {selectedJob ? (
                  <>
                    Applicants
                    {appTotalCount > 0 && <span style={{ color: t.muted, fontWeight: "400", fontSize: "13px", marginLeft: "6px" }}>({appTotalCount}{applicantStatusFilter !== "all" ? " - " + applicantStatusFilter : ""})</span>}
                  </>
                ) : "Select a job"}
              </h2>
              {isMobile && selectedJob && (
                <button onClick={() => { setSelectedJob(null); setApplications([]); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ background: "none", border: "1px solid " + t.border, borderRadius: "6px", padding: "5px 12px", color: t.muted, fontSize: "12px", cursor: "pointer" }}>
                  Back
                </button>
              )}
            </div>

            {selectedJob && applications.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                {STATUS_OPTIONS.map(s => (
                  <button key={s} onClick={() => setApplicantStatusFilter(s)} style={filterBtnStyle(applicantStatusFilter === s, statusColor[s])}>
                    {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                    <span style={{ marginLeft: "4px", opacity: 0.7 }}>({s === "all" ? applications.length : applications.filter(a => a.status === s).length})</span>
                  </button>
                ))}
              </div>
            )}

            {!selectedJob && <div style={{ background: t.cardBg, border: "1px solid " + t.border, borderRadius: "12px", padding: "32px", textAlign: "center" }}><p style={{ color: t.muted }}>{isMobile ? "Tap a job above to see applicants" : "Click on a job to see applicants"}</p></div>}
            {selectedJob && applications.length === 0 && <div style={{ background: t.cardBg, border: "1px solid " + t.border, borderRadius: "12px", padding: "32px", textAlign: "center" }}><p style={{ color: t.muted }}>No applications yet</p></div>}
            {selectedJob && applications.length > 0 && filteredApplicants.length === 0 && (
              <div style={{ background: t.cardBg, border: "1px solid " + t.border, borderRadius: "12px", padding: "32px", textAlign: "center" }}>
                <p style={{ color: t.muted }}>No {applicantStatusFilter} applications on this page</p>
                <button onClick={() => setApplicantStatusFilter("all")} style={{ marginTop: "12px", background: "none", border: "1px solid " + t.border, borderRadius: "6px", padding: "6px 14px", color: t.muted, fontSize: "12px", cursor: "pointer" }}>Show all</button>
              </div>
            )}

            {filteredApplicants.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {filteredApplicants.map(app => {
                  const statusStyle = getStatusColor(app.status);
                  return (
                    <div key={app._id} style={{ background: t.cardBg, border: "1px solid " + t.border, borderRadius: "12px", padding: "16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                        <div>
                          <p style={{ fontWeight: "600", color: t.text, margin: "0 0 4px", fontSize: "15px" }}>{app.userId?.name}</p>
                          <p style={{ color: t.muted, fontSize: "12px", margin: 0 }}>Applied: {new Date(app.createdAt).toLocaleDateString()}</p>
                        </div>
                        <span style={{ background: statusStyle.bg, color: statusStyle.color, padding: "4px 10px", borderRadius: "999px", fontSize: "12px", fontWeight: "600" }}>{app.status}</span>
                      </div>
                      <button onClick={() => viewResume(app.resumeUrl)} style={{ background: "none", border: "none", color: "#3b82f6", fontSize: "13px", cursor: "pointer", padding: 0, marginBottom: "12px", textDecoration: "underline" }}>View Resume</button>
                      <select value={app.status} onChange={(e) => handleStatusChange(app._id, e.target.value)} style={{ width: "100%", background: t.input, border: "1px solid " + t.inputBorder, borderRadius: "8px", padding: "8px 10px", fontSize: "13px", color: t.inputText, outline: "none" }}>
                        <option value="pending">Pending</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="shortlisted">Shortlisted</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedJob && (
              <>
                <Pagination currentPage={appCurrentPage} totalPages={appTotalPages} onPageChange={handleAppPageChange} isDark={isDark} t={t} />
                {appTotalPages > 1 && <p style={{ textAlign: "center", color: t.muted, fontSize: "11px", marginTop: "6px" }}>Page {appCurrentPage} of {appTotalPages} - {appTotalCount} total applicants</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
