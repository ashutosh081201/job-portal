import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { getThemeStyles } from "../../utils/theme";
import { useAuth } from "../../context/AuthContext"; // ✅ NEW
import { inferSalaryRange, isDeadlinePast } from "../../utils/jobs";

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

const SALARY_OPTIONS = [
  "Not Disclosed",
  "0-3 LPA",
  "3-6 LPA",
  "6-10 LPA",
  "10-15 LPA",
  "15-25 LPA",
  "25+ LPA",
  "Enter Custom",
];

const PREDEFINED_RANGES = [
  "Not Disclosed",
  "0-3 LPA",
  "3-6 LPA",
  "6-10 LPA",
  "10-15 LPA",
  "15-25 LPA",
  "25+ LPA",
];

const LocationAutocomplete = ({ value, onChange, inputStyle, isDark, t }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const filtered =
    value.length > 0
      ? CITIES.filter(
          (c) =>
            c.label.toLowerCase().includes(value.toLowerCase()) ||
            c.value.toLowerCase().includes(value.toLowerCase()),
        )
      : CITIES;

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
        style={inputStyle}
        placeholder="Type or select city..."
        autoComplete="off"
      />
      {showDropdown && filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: isDark ? "#1e293b" : "#ffffff",
            border: "1px solid " + t.border,
            borderRadius: "8px",
            zIndex: 200,
            maxHeight: "220px",
            overflowY: "auto",
            marginTop: "4px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          {filtered.map((city, i) => (
            <div
              key={city.value}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(city.value);
                setShowDropdown(false);
              }}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                color:
                  value === city.value
                    ? "#3b82f6"
                    : isDark
                      ? "#e2e8f0"
                      : "#1e293b",
                fontSize: "13px",
                background:
                  value === city.value
                    ? isDark
                      ? "#1e3a5f"
                      : "#dbeafe"
                    : "transparent",
                borderBottom:
                  i < filtered.length - 1 ? "1px solid " + t.border : "none",
              }}
            >
              {city.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EditJob = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { isDark } = useTheme();
  const t = getThemeStyles(isDark);
  const { user } = useAuth(); // ✅ NEW

  const [formData, setFormData] = useState({
    title: "",
    company: "",
    location: "",
    description: "",
    skills: "",
    workType: "On-site",
    experienceRequired: "Fresher",
    deadline: "",
    status: "active",
  });
  const [salaryType, setSalaryType] = useState("Not Disclosed");
  const [customSalary, setCustomSalary] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toggling, setToggling] = useState(false);

  const fetchJob = async () => {
    try {
      const res = await api.get("/jobs/" + id);
      const job = res.data.job;

      // ✅ NEW — ownership check: redirect immediately if not the job owner
      const ownerId = job.recruiterId?._id || job.recruiterId;
      if (ownerId?.toString() !== user?.id?.toString()) {
        navigate("/recruiter/dashboard");
        return;
      }

      setFormData({
        title: job.title || "",
        company: job.company || "",
        location: job.location || "",
        description: job.description || "",
        skills: job.skills?.join(", ") || "",
        workType: job.workType || "On-site",
        experienceRequired: job.experienceRequired || "Fresher",
        deadline: job.deadline
          ? new Date(job.deadline).toISOString().split("T")[0]
          : "",
        status: job.status || "active",
      });
      if (!job.salary || job.salary === "Not Disclosed") {
        setSalaryType("Not Disclosed");
        setCustomSalary("");
      } else if (PREDEFINED_RANGES.includes(job.salary)) {
        setSalaryType(job.salary);
        setCustomSalary("");
      } else {
        setSalaryType("Enter Custom");
        setCustomSalary(job.salary);
      }
    } catch (err) {
      setError(errorMessage(err, "Failed to load job"));
    }
    setFetching(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    fetchJob();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch only when the id changes
  }, [id]);

  const handleChange = (e) => {
    if (e.target.name === "deadline" && e.target.value) {
      const year = e.target.value.split("-")[0];
      if (year.length > 4) return;
    }
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleToggleStatus = async () => {
    setToggling(true);
    try {
      const res = await api.put("/jobs/" + id + "/status");
      setFormData((prev) => ({ ...prev, status: res.data.newStatus }));
    } catch (err) {
      setError(errorMessage(err, "Failed to update status"));
    }
    setToggling(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!formData.location.trim()) {
      setError("Please enter or select a location");
      return;
    }
    if (isDeadlinePast(formData.deadline)) {
      setError(
        "Deadline cannot be in the past — please choose today or a future date",
      );
      return;
    }
    setLoading(true);
    try {
      const skillsArray = formData.skills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s !== "");
      const salary =
        salaryType === "Enter Custom"
          ? customSalary || "Not Disclosed"
          : salaryType;
      const salaryRange =
        salaryType === "Enter Custom"
          ? inferSalaryRange(customSalary)
          : salaryType === "Not Disclosed"
            ? "Not Disclosed"
            : salaryType;
      await api.put("/jobs/" + id, {
        ...formData,
        skills: skillsArray,
        salary,
        salaryRange,
        deadline: formData.deadline || null,
      });
      navigate("/recruiter/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update job");
    }
    setLoading(false);
  };

  const inputStyle = {
    width: "100%",
    background: t.input,
    border: "1px solid " + t.inputBorder,
    borderRadius: "8px",
    padding: "10px 12px",
    fontSize: "14px",
    color: t.inputText,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: "500",
    color: t.label,
    marginBottom: "6px",
  };

  if (fetching)
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
    <div style={{ minHeight: "100vh", background: t.bg, padding: "32px 24px" }}>
      <div style={{ maxWidth: "640px", margin: "0 auto" }}>
        <div
          style={{
            background: t.cardBg,
            border: "1px solid " + t.border,
            borderRadius: "16px",
            padding: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "28px",
            }}
          >
            <h1
              style={{
                fontSize: "24px",
                fontWeight: "700",
                color: t.text,
                margin: 0,
              }}
            >
              Edit Job
            </h1>
            <button
              onClick={() => navigate("/recruiter/dashboard")}
              style={{
                background: "none",
                border: "1px solid " + t.border,
                borderRadius: "8px",
                padding: "8px 16px",
                color: t.muted,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>

          {/* Status toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
              padding: "14px 16px",
              background:
                formData.status === "active"
                  ? isDark
                    ? "#14532d"
                    : "#f0fdf4"
                  : isDark
                    ? "#2d1515"
                    : "#fef2f2",
              borderRadius: "10px",
              border:
                "1px solid " +
                (formData.status === "active" ? "#22c55e" : "#f87171"),
            }}
          >
            <div style={{ flex: 1 }}>
              <p
                style={{
                  margin: 0,
                  fontWeight: "600",
                  fontSize: "14px",
                  color: formData.status === "active" ? "#22c55e" : "#ef4444",
                }}
              >
                {formData.status === "active"
                  ? "Active — Accepting Applications"
                  : "Closed — Not Accepting Applications"}
              </p>
              <p
                style={{ margin: "2px 0 0", fontSize: "12px", color: t.muted }}
              >
                {formData.status === "active"
                  ? "Click to close this job"
                  : "Click to reopen this job"}
              </p>
            </div>
            <button
              onClick={handleToggleStatus}
              disabled={toggling}
              style={{
                background:
                  formData.status === "active" ? "#ef4444" : "#22c55e",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "13px",
                fontWeight: "600",
                cursor: toggling ? "not-allowed" : "pointer",
                opacity: toggling ? 0.6 : 1,
              }}
            >
              {toggling
                ? "..."
                : formData.status === "active"
                  ? "Close Job"
                  : "Reopen Job"}
            </button>
          </div>

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
            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Job Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                style={inputStyle}
                placeholder="e.g. Frontend Developer"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Company Name *</label>
              <input
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                required
                style={inputStyle}
                placeholder="e.g. Tech Corp"
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Location *</label>
              <LocationAutocomplete
                value={formData.location}
                onChange={(val) => setFormData({ ...formData, location: val })}
                inputStyle={inputStyle}
                isDark={isDark}
                t={t}
              />
              <p style={{ fontSize: "11px", color: t.muted, marginTop: "4px" }}>
                Select from list or type any city
              </p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Salary *</label>
              <select
                value={salaryType}
                onChange={(e) => {
                  setSalaryType(e.target.value);
                  setCustomSalary("");
                }}
                style={inputStyle}
              >
                {SALARY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {salaryType === "Enter Custom" && (
                <input
                  type="text"
                  value={customSalary}
                  onChange={(e) => setCustomSalary(e.target.value)}
                  style={{ ...inputStyle, marginTop: "8px" }}
                  placeholder="e.g. 7 LPA, 12-15 LPA"
                />
              )}
              {salaryType === "Enter Custom" && customSalary && (
                <p
                  style={{
                    fontSize: "11px",
                    color: "#22c55e",
                    marginTop: "4px",
                  }}
                >
                  Will be categorized as: {inferSalaryRange(customSalary)}
                </p>
              )}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Application Deadline</label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                style={inputStyle}
              />
              {isDeadlinePast(formData.deadline) && (
                <p
                  style={{
                    fontSize: "11px",
                    color: "#ef4444",
                    marginTop: "4px",
                  }}
                >
                  Deadline cannot be in the past — please choose today or a
                  future date
                </p>
              )}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Required Skills *</label>
              <input
                type="text"
                name="skills"
                value={formData.skills}
                onChange={handleChange}
                required
                style={inputStyle}
                placeholder="e.g. React, Node.js, MongoDB"
              />
              <p style={{ fontSize: "11px", color: t.muted, marginTop: "4px" }}>
                Comma separated
              </p>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Work Type *</label>
              <select
                name="workType"
                value={formData.workType}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="Remote">Remote</option>
                <option value="On-site">On-site</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={labelStyle}>Experience Required *</label>
              <select
                name="experienceRequired"
                value={formData.experienceRequired}
                onChange={handleChange}
                style={inputStyle}
              >
                <option value="Fresher">Fresher</option>
                <option value="0-1 years">0-1 years</option>
                <option value="1-3 years">1-3 years</option>
                <option value="3-5 years">3-5 years</option>
                <option value="5+ years">5+ years</option>
              </select>
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>Job Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={6}
                style={{ ...inputStyle, resize: "vertical" }}
                placeholder="Describe the role..."
              />
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
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditJob;
