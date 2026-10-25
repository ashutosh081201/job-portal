import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getThemeStyles } from "../utils/theme";
import { useIsMobile } from "../hooks/useIsMobile";

const Profile = () => {
  const { user, login, logout } = useAuth();
  const { isDark } = useTheme();
  const t = getThemeStyles(isDark);
  const navigate = useNavigate();
  const isMobile = useIsMobile(640);

  const [activeTab, setActiveTab] = useState("profile");
  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [profileMsg, setProfileMsg] = useState({ text: "", type: "" });
  const [passwordMsg, setPasswordMsg] = useState({ text: "", type: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [stats, setStats] = useState({
    applications: 0,
    jobs: 0,
    atsChecks: 0,
  });

  const fetchStats = async () => {
    try {
      if (user?.role === "jobseeker") {
        // ✅ FIXED — fetch both manual AND job-linked ATS history
        // previously only fetched manual checks so job-linked were not counted
        const [appRes, atsManualRes, atsJobRes] = await Promise.all([
          api.get("/applications/my?page=1&limit=1"),
          api.get("/ats/history?page=1&limit=1"),
          api.get("/ats/history/jobs?page=1&limit=1"),
        ]);
        setStats({
          applications: appRes.data.totalApplications || 0,
          // ✅ combine manual + job-linked counts for total ATS checks
          atsChecks:
            (atsManualRes.data.totalHistory || 0) +
            (atsJobRes.data.totalHistory || 0),
        });
      } else {
        const jobRes = await api.get("/jobs/recruiter/myjobs?page=1&limit=1");
        setStats({
          jobs: jobRes.data.totalJobs || 0,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    fetchStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg({ text: "", type: "" });
    try {
      const res = await api.put("/auth/profile", profileData);
      login(res.data.user, localStorage.getItem("token"));
      setProfileMsg({ text: "Profile updated successfully!", type: "success" });
    } catch (err) {
      setProfileMsg({
        text: err.response?.data?.message || "Failed to update profile",
        type: "error",
      });
    }
    setProfileLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMsg({ text: "", type: "" });
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMsg({ text: "Passwords do not match", type: "error" });
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordMsg({
        text: "Password must be at least 6 characters",
        type: "error",
      });
      return;
    }
    setPasswordLoading(true);
    try {
      await api.put("/auth/change-password", {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setPasswordMsg({
        text: "Password changed successfully!",
        type: "success",
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (err) {
      setPasswordMsg({
        text: err.response?.data?.message || "Failed to change password",
        type: "error",
      });
    }
    setPasswordLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;
    try {
      await api.delete("/auth/delete-account");
      logout();
      navigate("/");
    } catch (err) {
      alert(errorMessage(err, "Failed to delete account"));
    }
  };

  const inputStyle = {
    width: "100%",
    background: t.input,
    border: `1px solid ${t.inputBorder}`,
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

  const msgStyle = (type) => ({
    background:
      type === "success"
        ? isDark
          ? "#14532d"
          : "#f0fdf4"
        : isDark
          ? "#2d1515"
          : "#fef2f2",
    border: `1px solid ${type === "success" ? "#22c55e" : "#ef4444"}`,
    borderRadius: "8px",
    padding: "12px",
    marginBottom: "20px",
    color: type === "success" ? "#22c55e" : "#ef4444",
    fontSize: "14px",
  });

  const tabs = [
    { id: "profile", label: "👤 Profile" },
    { id: "password", label: "🔒 Password" },
    { id: "danger", label: isMobile ? "⚠️ Danger" : "⚠️ Danger Zone" },
  ];

  const statCard = (value, label, color) => (
    <div
      style={{
        background: t.bg,
        border: `1px solid ${t.border}`,
        borderRadius: "12px",
        padding: "14px 20px",
        textAlign: "center",
        minWidth: "76px",
      }}
    >
      <p
        style={{
          fontSize: "24px",
          fontWeight: "700",
          color,
          margin: "0 0 4px",
        }}
      >
        {value}
      </p>
      <p style={{ fontSize: "12px", color: t.muted, margin: 0 }}>{label}</p>
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
        {/* Profile Header */}
        <div
          style={{
            background: t.cardBg,
            border: `1px solid ${t.border}`,
            borderRadius: "16px",
            padding: isMobile ? "24px 20px" : "32px",
            marginBottom: "20px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            alignItems: "center",
            textAlign: isMobile ? "center" : "left",
            gap: isMobile ? "16px" : "24px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              fontWeight: "700",
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1 }}>
            <h1
              style={{
                fontSize: isMobile ? "20px" : "22px",
                fontWeight: "700",
                color: t.text,
                margin: "0 0 4px",
              }}
            >
              {user?.name}
            </h1>
            <p style={{ color: t.muted, fontSize: "14px", margin: "0 0 10px" }}>
              {user?.email}
            </p>
            <span
              style={{
                background:
                  user?.role === "recruiter"
                    ? isDark
                      ? "#1e3a5f"
                      : "#dbeafe"
                    : isDark
                      ? "#14532d"
                      : "#dcfce7",
                color: user?.role === "recruiter" ? "#3b82f6" : "#22c55e",
                padding: "4px 14px",
                borderRadius: "999px",
                fontSize: "12px",
                fontWeight: "600",
                textTransform: "capitalize",
              }}
            >
              {user?.role}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              gap: "10px",
              flexWrap: "wrap",
              justifyContent: isMobile ? "center" : "flex-end",
            }}
          >
            {user?.role === "jobseeker" ? (
              <>
                {statCard(stats.applications, "Applications", "#3b82f6")}
                {statCard(stats.atsChecks, "ATS Checks", "#a855f7")}
              </>
            ) : (
              statCard(stats.jobs, "Jobs Posted", "#3b82f6")
            )}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "20px",
            flexWrap: "wrap",
          }}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: isMobile ? "8px 14px" : "10px 20px",
                borderRadius: "8px",
                border: `1px solid ${activeTab === tab.id ? "#3b82f6" : t.border}`,
                background:
                  activeTab === tab.id
                    ? isDark
                      ? "#1e3a5f"
                      : "#dbeafe"
                    : t.cardBg,
                color: activeTab === tab.id ? "#3b82f6" : t.muted,
                fontSize: isMobile ? "13px" : "14px",
                fontWeight: "500",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div
          style={{
            background: t.cardBg,
            border: `1px solid ${t.border}`,
            borderRadius: "16px",
            padding: isMobile ? "20px" : "32px",
          }}
        >
          {activeTab === "profile" && (
            <div>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: t.text,
                  margin: "0 0 24px",
                }}
              >
                Profile Information
              </h2>
              {profileMsg.text && (
                <div style={msgStyle(profileMsg.type)}>{profileMsg.text}</div>
              )}
              <form onSubmit={handleProfileUpdate}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>Full Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    onChange={(e) =>
                      setProfileData({ ...profileData, name: e.target.value })
                    }
                    style={inputStyle}
                    placeholder="Your full name"
                  />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    value={profileData.email}
                    style={{
                      ...inputStyle,
                      opacity: 0.5,
                      cursor: "not-allowed",
                    }}
                    disabled
                  />
                  <p
                    style={{
                      fontSize: "12px",
                      color: t.muted,
                      marginTop: "4px",
                    }}
                  >
                    Email cannot be changed
                  </p>
                </div>
                <div style={{ marginBottom: "24px" }}>
                  <label style={labelStyle}>Role</label>
                  <input
                    type="text"
                    value={user?.role}
                    style={{
                      ...inputStyle,
                      opacity: 0.5,
                      cursor: "not-allowed",
                      textTransform: "capitalize",
                    }}
                    disabled
                  />
                  <p
                    style={{
                      fontSize: "12px",
                      color: t.muted,
                      marginTop: "4px",
                    }}
                  >
                    Role cannot be changed
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={profileLoading}
                  style={{
                    background: profileLoading ? "#93c5fd" : "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px 24px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: profileLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {profileLoading ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>
          )}

          {activeTab === "password" && (
            <div>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: t.text,
                  margin: "0 0 24px",
                }}
              >
                Change Password
              </h2>
              {passwordMsg.text && (
                <div style={msgStyle(passwordMsg.type)}>{passwordMsg.text}</div>
              )}
              <form onSubmit={handlePasswordChange}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        currentPassword: e.target.value,
                      })
                    }
                    required
                    style={inputStyle}
                    placeholder="Enter current password"
                  />
                </div>
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        newPassword: e.target.value,
                      })
                    }
                    required
                    style={inputStyle}
                    placeholder="Enter new password"
                  />
                </div>
                <div style={{ marginBottom: "24px" }}>
                  <label style={labelStyle}>Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({
                        ...passwordData,
                        confirmPassword: e.target.value,
                      })
                    }
                    required
                    style={inputStyle}
                    placeholder="Confirm new password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  style={{
                    background: passwordLoading ? "#93c5fd" : "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px 24px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: passwordLoading ? "not-allowed" : "pointer",
                  }}
                >
                  {passwordLoading ? "Changing..." : "Change Password"}
                </button>
              </form>
            </div>
          )}

          {activeTab === "danger" && (
            <div>
              <h2
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#ef4444",
                  margin: "0 0 8px",
                }}
              >
                Danger Zone
              </h2>
              <p
                style={{
                  color: t.muted,
                  fontSize: "14px",
                  marginBottom: "24px",
                }}
              >
                These actions are permanent and cannot be undone.
              </p>
              <div
                style={{
                  background: isDark ? "#2d1515" : "#fef2f2",
                  border: "1px solid #f87171",
                  borderRadius: "12px",
                  padding: "24px",
                }}
              >
                <h3
                  style={{
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#ef4444",
                    margin: "0 0 8px",
                  }}
                >
                  Delete Account
                </h3>
                <p
                  style={{
                    color: t.muted,
                    fontSize: "14px",
                    marginBottom: "16px",
                    lineHeight: "1.6",
                  }}
                >
                  Once you delete your account, all your data including
                  applications, resume, and ATS history will be permanently
                  deleted.
                </p>
                <button
                  onClick={handleDeleteAccount}
                  style={{
                    background: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "10px 20px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Delete My Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
