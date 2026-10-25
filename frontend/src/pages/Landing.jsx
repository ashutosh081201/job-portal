import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { getThemeStyles } from "../utils/theme";
import { useAuth } from "../context/AuthContext";
import { useIsMobile } from "../hooks/useIsMobile";

const Landing = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const t = getThemeStyles(isDark);
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const handleGetStarted = () => {
    if (user) {
      navigate(
        user.role === "recruiter" ? "/recruiter/dashboard" : "/dashboard",
      );
    } else {
      navigate("/register");
    }
  };

  const features = [
    {
      icon: "🔍",
      title: "Smart Job Search",
      desc: "Filter by skills, location, salary range, work type and experience level to find exactly what you're looking for.",
    },
    {
      icon: "📄",
      title: "Resume Builder",
      // ✅ removed "Jake's"
      desc: "Build a professional resume using our ATS-friendly template. Add education, experience, projects and skills.",
    },
    {
      icon: "🤖",
      title: "AI ATS Checker",
      desc: "Check how well your resume matches any job description. Get a score, matched keywords and improvement tips.",
    },
    {
      icon: "📊",
      title: "Application Tracker",
      desc: "Track every application in your personal dashboard. Know when recruiters review or shortlist your profile.",
    },
    {
      icon: "📬",
      title: "Email Notifications",
      desc: "Get notified the moment your application status changes — reviewed, shortlisted or any update from recruiters.",
    },
    {
      icon: "💼",
      title: "Recruiter Dashboard",
      desc: "Post jobs, browse applicants, view resumes and update hiring statuses — all from a single clean dashboard.",
    },
  ];

  const seekerBenefits = [
    "Browse and filter jobs by skills, salary and location",
    // ✅ removed "Jake's"
    "Build a professional resume with our builder",
    "Check ATS score against any job description",
    "Save multiple versions of your resume",
    "Track all applications and get status emails",
  ];

  const recruiterBenefits = [
    "Post jobs with detailed requirements and salary",
    "Receive applications with resumes instantly",
    "Review, shortlist or reject candidates easily",
    "Candidates get auto-notified on status updates",
    "Manage all your job postings in one place",
  ];

  return (
    <div style={{ minHeight: "100vh", background: t.bg }}>
      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: isMobile ? "56px 20px 44px" : "90px 24px 70px",
          textAlign: "center",
          background: isDark
            ? "linear-gradient(180deg, #020617 0%, #0f172a 100%)"
            : "linear-gradient(180deg, #dbeafe 0%, #f1f5f9 100%)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: isDark ? "#1e3a5f" : "#dbeafe",
            color: "#3b82f6",
            padding: "6px 18px",
            borderRadius: "999px",
            fontSize: "13px",
            fontWeight: "600",
            marginBottom: "24px",
            letterSpacing: "0.3px",
          }}
        >
          🚀 AI-Powered Career Platform
        </span>

        <h1
          style={{
            fontSize: isMobile
              ? "clamp(28px, 8vw, 40px)"
              : "clamp(34px, 5vw, 60px)",
            fontWeight: "800",
            color: t.text,
            margin: "0 0 16px",
            lineHeight: "1.15",
            letterSpacing: "-0.5px",
          }}
        >
          Find Your Dream Job
          <br />
          <span style={{ color: "#3b82f6" }}>With AI-Powered Tools</span>
        </h1>

        <p
          style={{
            fontSize: isMobile ? "15px" : "18px",
            color: t.muted,
            maxWidth: "540px",
            margin: "0 auto 32px",
            lineHeight: "1.7",
          }}
        >
          {/* ✅ removed "using Jake's template" */}
          Browse jobs, build a professional resume, and check your ATS score —
          all in one place.
        </p>

        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleGetStarted}
            style={{
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: isMobile ? "12px 28px" : "14px 36px",
              fontSize: isMobile ? "15px" : "16px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(59,130,246,0.4)",
            }}
          >
            {user ? "Go to Dashboard" : "Get Started Free"}
          </button>
          <button
            onClick={() => navigate("/jobs")}
            style={{
              background: "none",
              color: t.text,
              border: `2px solid ${t.border}`,
              borderRadius: "10px",
              padding: isMobile ? "12px 28px" : "14px 36px",
              fontSize: isMobile ? "15px" : "16px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Browse Jobs
          </button>
        </div>
      </div>

      {/* ── FEATURES ─────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: isMobile ? "48px 16px" : "72px 24px",
          maxWidth: "1100px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: isMobile ? "36px" : "52px",
          }}
        >
          <h2
            style={{
              fontSize: isMobile ? "26px" : "34px",
              fontWeight: "700",
              color: t.text,
              margin: "0 0 12px",
            }}
          >
            Everything You Need
          </h2>
          <p
            style={{
              color: t.muted,
              fontSize: isMobile ? "14px" : "16px",
              margin: 0,
            }}
          >
            Job search, resume building, and AI analysis — all in one place
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {features.map((f, i) => (
            <div
              key={i}
              style={{
                background: t.cardBg,
                border: `1px solid ${t.border}`,
                borderRadius: "14px",
                padding: isMobile ? "20px" : "28px",
              }}
            >
              <span
                style={{
                  fontSize: "32px",
                  display: "block",
                  marginBottom: "14px",
                }}
              >
                {f.icon}
              </span>
              <h3
                style={{
                  fontSize: "17px",
                  fontWeight: "700",
                  color: t.text,
                  margin: "0 0 8px",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  color: t.muted,
                  fontSize: "14px",
                  lineHeight: "1.65",
                  margin: 0,
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOR SEEKERS + RECRUITERS ──────────────────────────────────────────── */}
      <div
        style={{
          padding: isMobile ? "48px 16px" : "72px 24px",
          background: isDark ? "#070f1c" : "#f0f7ff",
        }}
      >
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <h2
            style={{
              textAlign: "center",
              fontSize: isMobile ? "26px" : "34px",
              fontWeight: "700",
              color: t.text,
              margin: isMobile ? "0 0 36px" : "0 0 52px",
            }}
          >
            Built for Both Sides of Hiring
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "24px",
            }}
          >
            {/* Job Seekers */}
            <div
              style={{
                background: t.cardBg,
                border: `1px solid ${t.border}`,
                borderRadius: "16px",
                padding: isMobile ? "24px" : "36px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "20px",
                }}
              >
                <span
                  style={{
                    background: isDark ? "#1e3a5f" : "#dbeafe",
                    padding: "8px 16px",
                    borderRadius: "10px",
                    fontSize: "22px",
                  }}
                >
                  👤
                </span>
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "#3b82f6",
                    margin: 0,
                  }}
                >
                  Job Seekers
                </h3>
              </div>
              {seekerBenefits.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginBottom: "14px",
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      color: "#22c55e",
                      flexShrink: 0,
                      fontWeight: "700",
                      fontSize: "15px",
                      marginTop: "1px",
                    }}
                  >
                    ✓
                  </span>
                  <span
                    style={{
                      color: t.muted,
                      fontSize: "14px",
                      lineHeight: "1.55",
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
              {!user && (
                <button
                  onClick={() => navigate("/register")}
                  style={{
                    marginTop: "24px",
                    width: "100%",
                    background: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Sign Up as Job Seeker
                </button>
              )}
            </div>

            {/* Recruiters */}
            <div
              style={{
                background: t.cardBg,
                border: `1px solid ${t.border}`,
                borderRadius: "16px",
                padding: isMobile ? "24px" : "36px",
              }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "10px",
                  marginBottom: "20px",
                }}
              >
                <span
                  style={{
                    background: isDark ? "#2e1065" : "#ede9fe",
                    padding: "8px 16px",
                    borderRadius: "10px",
                    fontSize: "22px",
                  }}
                >
                  🏢
                </span>
                <h3
                  style={{
                    fontSize: "20px",
                    fontWeight: "700",
                    color: "#a855f7",
                    margin: 0,
                  }}
                >
                  Recruiters
                </h3>
              </div>
              {recruiterBenefits.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: "12px",
                    marginBottom: "14px",
                    alignItems: "flex-start",
                  }}
                >
                  <span
                    style={{
                      color: "#22c55e",
                      flexShrink: 0,
                      fontWeight: "700",
                      fontSize: "15px",
                      marginTop: "1px",
                    }}
                  >
                    ✓
                  </span>
                  <span
                    style={{
                      color: t.muted,
                      fontSize: "14px",
                      lineHeight: "1.55",
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
              {!user && (
                <button
                  onClick={() => navigate("/register")}
                  style={{
                    marginTop: "24px",
                    width: "100%",
                    background: "#a855f7",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Sign Up as Recruiter
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: isMobile ? "48px 16px" : "72px 24px",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            fontSize: isMobile ? "26px" : "34px",
            fontWeight: "700",
            color: t.text,
            margin: isMobile ? "0 0 36px" : "0 0 52px",
          }}
        >
          How It Works
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
          }}
        >
          {[
            {
              step: "01",
              title: "Create Account",
              desc: "Sign up as a job seeker or recruiter in under a minute.",
            },
            {
              step: "02",
              title: "Build Your Profile",
              desc: "Create your resume, or post jobs if you're hiring.",
            },
            {
              step: "03",
              title: "Find Your Match",
              desc: "Apply to jobs or hire the right candidate with ease.",
            },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                background: t.cardBg,
                border: `1px solid ${t.border}`,
                borderRadius: "14px",
                padding: isMobile ? "20px" : "28px",
                textAlign: "center",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  fontSize: "28px",
                  fontWeight: "800",
                  color: "#3b82f6",
                  marginBottom: "14px",
                  fontFamily: "monospace",
                }}
              >
                {item.step}
              </span>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: t.text,
                  margin: "0 0 8px",
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  color: t.muted,
                  fontSize: "13px",
                  lineHeight: "1.6",
                  margin: 0,
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      {!user && (
        <div
          style={{
            padding: isMobile ? "48px 20px" : "72px 24px",
            textAlign: "center",
            background: isDark ? "#070f1c" : "#f0f7ff",
          }}
        >
          <h2
            style={{
              fontSize: isMobile ? "24px" : "34px",
              fontWeight: "700",
              color: t.text,
              margin: "0 0 14px",
            }}
          >
            Ready to Get Started?
          </h2>
          <p
            style={{
              color: t.muted,
              fontSize: isMobile ? "14px" : "16px",
              margin: "0 0 28px",
              lineHeight: "1.6",
            }}
          >
            Create your free account and take the next step in your career
            today.
          </p>
          <button
            onClick={() => navigate("/register")}
            style={{
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: isMobile ? "12px 32px" : "14px 44px",
              fontSize: isMobile ? "15px" : "16px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow: "0 4px 14px rgba(59,130,246,0.4)",
            }}
          >
            Create Free Account
          </button>
        </div>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          borderTop: `1px solid ${t.border}`,
          padding: "24px",
          textAlign: "center",
        }}
      >
        <p style={{ color: t.muted, fontSize: "13px", margin: 0 }}>
          © 2026 JobVerse — Made with ❤️&nbsp;by Ashutosh
        </p>
      </div>
    </div>
  );
};

export default Landing;
