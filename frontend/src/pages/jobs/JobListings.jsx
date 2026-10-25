import { useState, useEffect } from "react";
import api, { errorMessage } from "../../services/api";
import JobCard from "../../components/jobs/JobCard";
import { useTheme } from "../../context/ThemeContext";
import { getThemeStyles } from "../../utils/theme";
import { useAuth } from "../../context/AuthContext";
import { useIsMobile } from "../../hooks/useIsMobile";

const CITIES = [
  { label: "Bengaluru / Bangalore", value: "Bengaluru" },
  { label: "Chennai", value: "Chennai" },
  { label: "Mumbai", value: "Mumbai" },
  { label: "Pune", value: "Pune" },
  { label: "Delhi NCR / New Delhi", value: "Delhi NCR" },
  { label: "Noida", value: "Noida" },
  { label: "Gurugram / Gurgaon", value: "Gurugram" },
  { label: "Hyderabad", value: "Hyderabad" },
  { label: "Kolkata", value: "Kolkata" },
  { label: "Lucknow", value: "Lucknow" },
  { label: "Indore", value: "Indore" },
  { label: "Vizag", value: "Vizag" },
  { label: "Ahmedabad", value: "Ahmedabad" },
  { label: "Jaipur", value: "Jaipur" },
  { label: "Remote", value: "Remote" },
];
const WORK_TYPES = ["Remote", "On-site", "Hybrid"];
const EXPERIENCE_LEVELS = ["Fresher", "0-1 years", "1-3 years", "3-5 years", "5+ years"];
const SALARY_RANGES = ["0-3 LPA", "3-6 LPA", "6-10 LPA", "10-15 LPA", "15-25 LPA", "25+ LPA"];
const JOBS_PER_PAGE = 10;

const LocationAutocomplete = ({ value, onChange, inputStyle, isDark, t }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const filtered = value.length > 0
    ? CITIES.filter(c => c.label.toLowerCase().includes(value.toLowerCase()) || c.value.toLowerCase().includes(value.toLowerCase()))
    : CITIES;
  return (
    <div style={{ position: "relative" }}>
      <input type="text" value={value} onChange={(e) => { onChange(e.target.value); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} onBlur={() => setTimeout(() => setShowDropdown(false), 150)} style={{ ...inputStyle, width: "100%" }} placeholder="Type or select city..." autoComplete="off" />
      {showDropdown && filtered.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: isDark ? "#1e293b" : "#ffffff", border: "1px solid " + t.border, borderRadius: "8px", zIndex: 300, maxHeight: "200px", overflowY: "auto", marginTop: "4px", boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
          {value && <div onMouseDown={(e) => { e.preventDefault(); onChange(""); setShowDropdown(false); }} style={{ padding: "8px 14px", cursor: "pointer", color: "#ef4444", fontSize: "12px", borderBottom: "1px solid " + t.border }}>Clear location</div>}
          {filtered.map((city, i) => (
            <div key={city.value} onMouseDown={(e) => { e.preventDefault(); onChange(city.value); setShowDropdown(false); }} style={{ padding: "9px 14px", cursor: "pointer", fontSize: "13px", color: value === city.value ? "#3b82f6" : isDark ? "#e2e8f0" : "#1e293b", background: value === city.value ? (isDark ? "#1e3a5f" : "#dbeafe") : "transparent", borderBottom: i < filtered.length - 1 ? "1px solid " + t.border : "none" }}>
              {city.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Pagination = ({ currentPage, totalPages, onPageChange, t, isMobile }) => {
  if (totalPages <= 1) return null;
  const getPageNumbers = () => {
    const pages = [];
    const delta = isMobile ? 1 : 2;
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) pages.push(i);
    if (currentPage - delta > 2) pages.unshift("...");
    if (currentPage + delta < totalPages - 1) pages.push("...");
    pages.unshift(1);
    if (totalPages > 1) pages.push(totalPages);
    return pages;
  };
  const btnBase = { minWidth: isMobile ? "34px" : "38px", height: isMobile ? "34px" : "38px", border: "1px solid " + t.border, borderRadius: "8px", fontSize: isMobile ? "13px" : "14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "500" };
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", marginTop: "28px", paddingBottom: "16px", flexWrap: "wrap" }}>
      <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} style={{ ...btnBase, background: t.cardBg, color: t.muted, opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>Prev</button>
      {getPageNumbers().map((page, i) =>
        page === "..." ? <span key={"dots-" + i} style={{ color: t.muted, fontSize: "14px", padding: "0 4px" }}>...</span>
        : <button key={page} onClick={() => onPageChange(page)} style={{ ...btnBase, background: page === currentPage ? "#3b82f6" : t.cardBg, color: page === currentPage ? "#fff" : t.muted, border: page === currentPage ? "1px solid #3b82f6" : "1px solid " + t.border, fontWeight: page === currentPage ? "700" : "500" }}>{page}</button>
      )}
      <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} style={{ ...btnBase, background: t.cardBg, color: t.muted, opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>Next</button>
    </div>
  );
};

const JobListings = () => {
  const { isDark } = useTheme();
  const t = getThemeStyles(isDark);
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [filters, setFilters] = useState({ search: "", skills: "", location: "", workType: "", experienceRequired: "", salaryRange: "" });

  const fetchAppliedJobIds = async () => {
    try {
      const res = await api.get("/applications/my?limit=1000&page=1");
      return res.data.applications.filter(app => app.jobId).map(app => app.jobId?._id || app.jobId);
    } catch { return []; }
  };

  const fetchSavedJobIds = async () => {
    try {
      const res = await api.get("/saved-jobs/ids");
      setSavedJobIds(res.data.jobIds || []);
    } catch { setSavedJobIds([]); }
  };

  const handleToggleSave = async (jobId) => {
    try {
      const res = await api.post("/saved-jobs/toggle", { jobId });
      if (res.data.saved) { setSavedJobIds(prev => [...prev, jobId]); }
      else { setSavedJobIds(prev => prev.filter(id => id !== jobId)); }
    } catch (err) { alert(errorMessage(err, "Failed to save job")); }
  };

  const fetchJobs = async (params = {}, page = 1, passedAppliedIds = null) => {
    setLoading(true);
    setLoadError("");
    try {
      const query = new URLSearchParams();
      if (params.search) query.append("search", params.search);
      if (params.skills) query.append("skills", params.skills);
      if (params.location) query.append("location", params.location);
      if (params.workType) query.append("workType", params.workType);
      if (params.experienceRequired) query.append("experienceRequired", params.experienceRequired);
      if (params.salaryRange) query.append("salaryRange", params.salaryRange);
      if (user?.role === "recruiter") query.append("excludeRecruiter", user.id);

      // ✅ Always use passedAppliedIds if provided, otherwise use state
      // This fixes the bug where search/clear/page change lost the applied IDs
      const idsToExclude = passedAppliedIds !== null ? passedAppliedIds : appliedJobIds;
      if (user?.role === "jobseeker" && idsToExclude.length > 0) {
        query.append("excludeJobIds", idsToExclude.join(","));
      }

      query.append("page", page);
      query.append("limit", JOBS_PER_PAGE);
      const res = await api.get("/jobs?" + query.toString());
      setJobs(res.data.jobs);
      setCurrentPage(res.data.currentPage || 1);
      setTotalPages(res.data.totalPages || 1);
      setTotalJobs(res.data.totalJobs || 0);
    } catch (err) {
      // don't leave the previous results on screen under the new filters
      setJobs([]);
      setTotalJobs(0);
      setTotalPages(1);
      setLoadError(errorMessage(err, "Could not load jobs. Please try again."));
    }
    setLoading(false);
  };

  useEffect(() => {
    const init = async () => {
      let appliedIds = [];
      if (user?.role === "jobseeker") {
        appliedIds = await fetchAppliedJobIds();
        setAppliedJobIds(appliedIds);
        fetchSavedJobIds();
      }
      fetchJobs({}, 1, appliedIds);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- rerun only when the logged-in user changes
  }, [user?.id]);

  // ✅ FIXED — all 3 handlers now explicitly pass appliedJobIds so search never shows applied jobs
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchJobs(filters, 1, appliedJobIds);
  };

  const handleFilterChange = (key, value) => setFilters(prev => ({ ...prev, [key]: value }));

  const handleClear = () => {
    const empty = { search: "", skills: "", location: "", workType: "", experienceRequired: "", salaryRange: "" };
    setFilters(empty);
    setCurrentPage(1);
    fetchJobs(empty, 1, appliedJobIds);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchJobs(filters, page, appliedJobIds);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasActiveFilters = filters.search || filters.skills || filters.location || filters.workType || filters.experienceRequired || filters.salaryRange;

  const inputStyle = { width: "100%", background: t.input, border: "1px solid " + t.inputBorder, borderRadius: "8px", padding: "9px 12px", fontSize: "13px", color: t.inputText, outline: "none", boxSizing: "border-box" };
  const selectStyle = { ...inputStyle, cursor: "pointer" };
  const labelStyle = { display: "block", fontSize: "12px", fontWeight: "500", color: t.label, marginBottom: "5px" };

  const emptyMessage = () => {
    if (hasActiveFilters) return "No jobs found matching your filters";
    if (user?.role === "recruiter") return "No jobs from other companies yet";
    if (user?.role === "jobseeker") return "No new jobs available right now";
    return "No jobs available right now";
  };

  return (
    <div style={{ minHeight: "100vh", background: t.bg, padding: isMobile ? "20px 16px" : "32px 24px" }}>
      <div style={{ maxWidth: "860px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px" }}>
          <h1 style={{ fontSize: isMobile ? "22px" : "28px", fontWeight: "700", color: t.text, margin: 0 }}>Browse Jobs</h1>
          {!loading && totalJobs > 0 && <span style={{ color: t.muted, fontSize: "13px" }}>{totalJobs} job{totalJobs !== 1 ? "s" : ""} {user?.role === "jobseeker" ? "available" : "found"}</span>}
        </div>

        <form onSubmit={handleSearch}>
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
              <input type="text" value={filters.search} onChange={(e) => handleFilterChange("search", e.target.value)} placeholder="Search jobs..." style={{ ...inputStyle, padding: "10px 14px", fontSize: "14px" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button type="submit" style={{ flex: 1, background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", padding: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Search</button>
                <button type="button" onClick={() => setShowFilters(!showFilters)} style={{ flex: 1, background: showFilters ? (isDark ? "#1e3a5f" : "#dbeafe") : t.cardBg, color: showFilters ? "#3b82f6" : t.muted, border: "1px solid " + (showFilters ? "#3b82f6" : t.border), borderRadius: "8px", padding: "10px", fontSize: "14px", cursor: "pointer" }}>
                  Filters {hasActiveFilters ? "*" : ""}
                </button>
                {hasActiveFilters && <button type="button" onClick={handleClear} style={{ background: t.cardBg, color: t.muted, border: "1px solid " + t.border, borderRadius: "8px", padding: "10px 14px", fontSize: "14px", cursor: "pointer" }}>X</button>}
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
              <input type="text" value={filters.search} onChange={(e) => handleFilterChange("search", e.target.value)} placeholder="Search by title, company or skill..." style={{ ...inputStyle, flex: 1, padding: "10px 14px", fontSize: "14px" }} />
              <button type="submit" style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" }}>Search</button>
              <button type="button" onClick={() => setShowFilters(!showFilters)} style={{ background: showFilters ? (isDark ? "#1e3a5f" : "#dbeafe") : t.cardBg, color: showFilters ? "#3b82f6" : t.muted, border: "1px solid " + (showFilters ? "#3b82f6" : t.border), borderRadius: "8px", padding: "10px 16px", fontSize: "14px", cursor: "pointer", whiteSpace: "nowrap" }}>
                Filters {hasActiveFilters ? "*" : ""}
              </button>
              {hasActiveFilters && <button type="button" onClick={handleClear} style={{ background: t.cardBg, color: t.muted, border: "1px solid " + t.border, borderRadius: "8px", padding: "10px 14px", fontSize: "14px", cursor: "pointer", whiteSpace: "nowrap" }}>Clear</button>}
            </div>
          )}

          {showFilters && (
            <div style={{ background: t.cardBg, border: "1px solid " + t.border, borderRadius: "12px", padding: isMobile ? "16px" : "20px", marginBottom: "20px" }}>
              <p style={{ color: t.text, fontWeight: "600", fontSize: "14px", marginBottom: "16px" }}>Filter Jobs</p>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={labelStyle}>Skills</label>
                  <input type="text" value={filters.skills} onChange={(e) => handleFilterChange("skills", e.target.value)} placeholder="e.g. React, Java" style={inputStyle} />
                  <p style={{ fontSize: "11px", color: t.muted, marginTop: "3px" }}>Comma separated</p>
                </div>
                <div>
                  <label style={labelStyle}>Location</label>
                  <LocationAutocomplete value={filters.location} onChange={(val) => handleFilterChange("location", val)} inputStyle={inputStyle} isDark={isDark} t={t} />
                </div>
                <div>
                  <label style={labelStyle}>Work Type</label>
                  <select value={filters.workType} onChange={(e) => handleFilterChange("workType", e.target.value)} style={selectStyle}>
                    <option value="">All Types</option>
                    {WORK_TYPES.map(w => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Experience Required</label>
                  <select value={filters.experienceRequired} onChange={(e) => handleFilterChange("experienceRequired", e.target.value)} style={selectStyle}>
                    <option value="">All Levels</option>
                    {EXPERIENCE_LEVELS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Salary Range</label>
                  <select value={filters.salaryRange} onChange={(e) => handleFilterChange("salaryRange", e.target.value)} style={selectStyle}>
                    <option value="">All Salaries</option>
                    {SALARY_RANGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" style={{ marginTop: "16px", width: "100%", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", padding: "10px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Apply Filters</button>
            </div>
          )}
        </form>

        {hasActiveFilters && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
            {filters.search && <span style={{ background: isDark ? "#1e3a5f" : "#dbeafe", color: "#3b82f6", padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "500" }}>Search: {filters.search}</span>}
            {filters.skills && <span style={{ background: isDark ? "#14532d" : "#dcfce7", color: "#22c55e", padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "500" }}>Skills: {filters.skills}</span>}
            {filters.location && <span style={{ background: isDark ? "#422006" : "#fef9c3", color: "#ca8a04", padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "500" }}>Location: {filters.location}</span>}
            {filters.workType && <span style={{ background: isDark ? "#2e1065" : "#ede9fe", color: "#a855f7", padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "500" }}>{filters.workType}</span>}
            {filters.experienceRequired && <span style={{ background: isDark ? "#2d1515" : "#fef2f2", color: "#ef4444", padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "500" }}>{filters.experienceRequired}</span>}
            {filters.salaryRange && <span style={{ background: isDark ? "#14532d" : "#dcfce7", color: "#16a34a", padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: "500" }}>{filters.salaryRange}</span>}
          </div>
        )}

        {loading ? (
          <p style={{ color: t.muted, textAlign: "center", padding: "40px" }}>Loading jobs...</p>
        ) : jobs.length === 0 ? (
          <div style={{ background: t.cardBg, border: "1px solid " + t.border, borderRadius: "12px", padding: "48px", textAlign: "center" }}>
            <p style={{ fontSize: "32px", margin: "0 0 12px" }}>🔍</p>
            <p style={{ color: loadError ? "#ef4444" : t.muted, fontSize: "15px", marginBottom: "16px" }}>{loadError || emptyMessage()}</p>
            {hasActiveFilters && <button onClick={handleClear} style={{ background: "#3b82f6", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 24px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}>Clear Filters</button>}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {jobs.map(job => (
                <JobCard
                  key={job._id}
                  job={job}
                  isDark={isDark}
                  t={t}
                  savedJobIds={user?.role === "jobseeker" ? savedJobIds : []}
                  onToggleSave={user?.role === "jobseeker" ? handleToggleSave : null}
                />
              ))}
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} isDark={isDark} t={t} isMobile={isMobile} />
            {totalPages > 1 && <p style={{ textAlign: "center", color: t.muted, fontSize: "12px", marginTop: "8px" }}>Page {currentPage} of {totalPages} - {totalJobs} total jobs</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default JobListings;
