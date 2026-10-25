import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../../services/api";
import JakesTemplate from "../../components/resume/JakesTemplate";
import { useTheme } from "../../context/ThemeContext";
import { getThemeStyles } from "../../utils/theme";
import { useWindowWidth } from "../../hooks/useWindowWidth";
import { normalizeUrl, extractLinkedInUsername, extractGithubUsername } from "../../utils/links";

const cleanEducationForSave = (education = []) => {
  return education
    .filter((e) => {
      if (e.eduType === "school") return e.schoolName?.trim();
      return e.university?.trim() || e.degree?.trim();
    })
    .map((e) => {
      if (e.eduType === "school") {
        return {
          eduType: "school",
          schoolName: e.schoolName?.trim() || "",
          schoolType: e.schoolType || "Senior Secondary",
          location: e.location?.trim() || "",
          startDate: e.startDate?.trim() || "",
          endDate: e.endDate?.trim() || "",
          marks: e.marks?.trim() || "",
          board: e.board?.trim() || "",
        };
      }
      return {
        eduType: "university",
        university: e.university?.trim() || "",
        degree: e.degree?.trim() || "",
        location: e.location?.trim() || "",
        startDate: e.startDate?.trim() || "",
        endDate: e.endDate?.trim() || "",
        gpa: e.gpa?.trim() || "",
      };
    });
};

const buildContactHTML = (personal) => {
  const items = [];
  if (personal.phone) items.push(personal.phone);
  if (personal.email)
    items.push(
      `<a href="mailto:${personal.email}" style="color:inherit;text-decoration:none;">${personal.email}</a>`,
    );
  if (personal.linkedin) {
    const u = extractLinkedInUsername(personal.linkedin);
    if (u)
      items.push(
        `<a href="https://www.linkedin.com/in/${u}" style="color:inherit;text-decoration:none;">${u}</a>`,
      );
  }
  if (personal.github) {
    const u = extractGithubUsername(personal.github);
    if (u)
      items.push(
        `<a href="https://github.com/${u}" style="color:inherit;text-decoration:none;">${u}</a>`,
      );
  }
  return items.join(" | ");
};

// ── defaults ──────────────────────────────────────────────────────────────────
const defaultUniversity = {
  eduType: "university",
  university: "",
  degree: "",
  location: "",
  startDate: "",
  endDate: "",
  gpa: "",
};
const defaultSchool = {
  eduType: "school",
  schoolName: "",
  schoolType: "Senior Secondary",
  location: "",
  startDate: "",
  endDate: "",
  marks: "",
  board: "",
};

// ✅ FIXED — factory function returns a BRAND NEW deep copy every call.
// Previously this was a single shared object — editing one resume's
// nested fields (education/experience/projects/certs) mutated this shared
// object directly, "leaking" old data into every future "new resume" reset.
const createDefaultResumeData = () => ({
  personalInfo: { name: "", email: "", phone: "", linkedin: "", github: "" },
  education: [{ ...defaultUniversity }],
  experience: [
    {
      company: "",
      role: "",
      location: "",
      startDate: "",
      endDate: "",
      bullets: ["", "", "", "", ""],
    },
  ],
  projects: [{ name: "", url: "", techStack: "", bullets: ["", "", "", ""] }],
  certifications: [{ name: "", issuer: "", date: "", url: "" }],
  achievements: [{ title: "", description: "" }],
  skills: { languages: "", frameworks: "", tools: "", libraries: "" },
});

// ── PDF generator (unchanged) ─────────────────────────────────────────────────
const generatePrintHTML = (data, name) => {
  const personal = data.personalInfo || {};
  const education = data.education || [];
  const experience = data.experience || [];
  const projects = data.projects || [];
  const skills = data.skills || {};
  const certifications = (data.certifications || []).filter((c) => c.name);
  const achievements = (data.achievements || []).filter((a) => a.title);
  const hasCertsOrAchievements =
    certifications.length > 0 || achievements.length > 0;

  const validEdu = education.filter(
    (e) => e.university?.trim() || e.degree?.trim() || e.schoolName?.trim(),
  );

  const educationHTML = validEdu
    .map((edu) => {
      if (edu.eduType === "school") {
        const dateStr =
          edu.startDate && edu.endDate
            ? `${edu.startDate} – ${edu.endDate}`
            : edu.endDate || edu.startDate || edu.year || "";
        return `<div style="margin-bottom:4px;"><table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr><td style="text-align:left;width:70%;"><strong>${edu.schoolName || ""}</strong></td><td style="text-align:right;width:30%;white-space:nowrap;">${edu.location || ""}</td></tr><tr><td style="text-align:left;"><em>${edu.schoolType || ""}${edu.marks ? ` | ${edu.marks}` : ""}${edu.board ? ` | ${edu.board}` : ""}</em></td><td style="text-align:right;white-space:nowrap;">${dateStr}</td></tr></table></div>`;
      }
      return `<div style="margin-bottom:4px;"><table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr><td style="text-align:left;width:70%;"><strong>${edu.university || ""}</strong></td><td style="text-align:right;width:30%;white-space:nowrap;">${edu.location || ""}</td></tr><tr><td style="text-align:left;"><em>${edu.degree || ""}${edu.gpa ? ` | GPA: ${edu.gpa}` : ""}</em></td><td style="text-align:right;white-space:nowrap;">${edu.startDate || ""}${edu.endDate ? ` – ${edu.endDate}` : ""}</td></tr></table></div>`;
    })
    .join("");

  const experienceHTML = experience
    .filter((e) => e.company || e.role)
    .map(
      (exp) => `
    <div style="margin-bottom:6px;"><table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr><td style="text-align:left;width:70%;"><strong>${exp.role || ""}</strong></td><td style="text-align:right;width:30%;white-space:nowrap;">${exp.startDate || ""}${exp.endDate ? ` – ${exp.endDate}` : ""}</td></tr><tr><td style="text-align:left;"><em>${exp.company || ""}</em></td><td style="text-align:right;white-space:nowrap;">${exp.location || ""}</td></tr></table>
    ${
      (exp.bullets || []).filter((b) => b).length > 0
        ? `<ul style="margin:3px 0 0 0;padding-left:20px;">${(exp.bullets || [])
            .filter((b) => b)
            .map((b) => `<li style="margin-bottom:1px;">${b}</li>`)
            .join("")}</ul>`
        : ""
    }
    </div>`,
    )
    .join("");

  const projectsHTML = projects
    .filter((p) => p.name)
    .map(
      (proj) => `
    <div style="margin-bottom:6px;"><p style="margin:0 0 2px 0;">${proj.url ? `<a href="${normalizeUrl(proj.url)}" style="color:inherit;text-decoration:none;"><strong>${proj.name || ""}</strong></a>` : `<strong>${proj.name || ""}</strong>`}${proj.techStack ? ` | <em>${proj.techStack}</em>` : ""}</p>
    ${
      (proj.bullets || []).filter((b) => b).length > 0
        ? `<ul style="margin:2px 0 0 0;padding-left:20px;">${(
            proj.bullets || []
          )
            .filter((b) => b)
            .map((b) => `<li style="margin-bottom:1px;">${b}</li>`)
            .join("")}</ul>`
        : ""
    }
    </div>`,
    )
    .join("");

  const skillsHTML = `<div style="padding-left:2px;">${skills.languages ? `<p style="margin:2px 0;"><strong>Languages:</strong> ${skills.languages}</p>` : ""}${skills.frameworks ? `<p style="margin:2px 0;"><strong>Frameworks:</strong> ${skills.frameworks}</p>` : ""}${skills.tools ? `<p style="margin:2px 0;"><strong>Tools:</strong> ${skills.tools}</p>` : ""}${skills.libraries ? `<p style="margin:2px 0;"><strong>Libraries:</strong> ${skills.libraries}</p>` : ""}</div>`;

  const certsHTML = certifications
    .map(
      (cert) =>
        `<div style="margin-bottom:4px;"><table style="width:100%;border-collapse:collapse;table-layout:fixed;"><tr><td style="text-align:left;width:70%;"><strong>${cert.name || ""}</strong></td><td style="text-align:right;width:30%;white-space:nowrap;">${cert.date || ""}</td></tr></table>${cert.issuer ? `<p style="margin:1px 0 0 0;"><em>${cert.issuer}</em>${cert.url ? ` — <a href="${normalizeUrl(cert.url)}" style="color:inherit;text-decoration:underline;">Click Here</a>` : ""}</p>` : ""}</div>`,
    )
    .join("");

  const achievementsHTML = achievements
    .map(
      (ach) =>
        `<div style="margin-bottom:3px;"><p style="margin:2px 0;"><strong>${ach.title || ""}</strong>${ach.description ? ` — ${ach.description}` : ""}</p></div>`,
    )
    .join("");

  const sectionHeader = (title) =>
    `<div style="border-bottom:1.2px solid black;margin-top:8px;margin-bottom:5px;"><h2 style="font-size:11.5px;text-transform:uppercase;letter-spacing:0.8px;margin:0;padding:0;font-weight:bold;font-family:'Times New Roman',serif;">${title}</h2></div>`;

  return `<!DOCTYPE html><html><head><title>${name || personal.name || "Resume"}</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Times New Roman', serif; font-size: 11px; color: #000; background: #fff; line-height: 1.45; } .page { width: 210mm; min-height: 297mm; padding: 14mm 18mm; margin: 0 auto; } table { border-collapse: collapse; } ul { padding-left: 20px; } li { margin-bottom: 1px; } p { margin: 2px 0; } a { color: inherit; } @media print { html, body { width: 210mm; } .page { width: 210mm; padding: 14mm 18mm; margin: 0; } @page { size: A4; margin: 0; } }</style></head><body><div class="page"><div style="text-align:center;margin-bottom:10px;"><h1 style="font-size:22px;font-weight:bold;letter-spacing:0.5px;margin:0 0 4px 0;">${personal.name || "Your Name"}</h1><p style="font-size:10.5px;margin:0;">${buildContactHTML(personal)}</p></div>${validEdu.length > 0 ? `<div style="margin-bottom:6px;">${sectionHeader("Education")}${educationHTML}</div>` : ""}${experience.filter((e) => e.company || e.role).length > 0 ? `<div style="margin-bottom:6px;">${sectionHeader("Experience")}${experienceHTML}</div>` : ""}${projects.filter((p) => p.name).length > 0 ? `<div style="margin-bottom:6px;">${sectionHeader("Projects")}${projectsHTML}</div>` : ""}${skills.languages || skills.frameworks || skills.tools || skills.libraries ? `<div style="margin-bottom:6px;">${sectionHeader("Technical Skills")}${skillsHTML}</div>` : ""}${hasCertsOrAchievements ? `<div style="margin-bottom:6px;">${sectionHeader("Certifications & Achievements")}${certsHTML}${achievementsHTML}</div>` : ""}</div><script>window.onload=function(){setTimeout(function(){window.print()},400)}</script></body></html>`;
};

// ── component ─────────────────────────────────────────────────────────────────
const ResumeBuilder = () => {
  const { isDark } = useTheme();
  const t = getThemeStyles(isDark);
  const navigate = useNavigate();
  const location = useLocation();

  // ── responsive ──────────────────────────────────────────────────────────────
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 900;
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  // scale the 794px template to fit screen on mobile preview
  const mobilePreviewScale = Math.min(0.75, (windowWidth - 24) / 794);

  // ── state ───────────────────────────────────────────────────────────────────
  // ✅ lazy initializer — calls the factory once on mount, gets a fresh object
  const [resumeData, setResumeData] = useState(createDefaultResumeData);
  const [resumeId, setResumeId] = useState(null);
  const [resumeName, setResumeName] = useState("My Resume");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [activeSection, setActiveSection] = useState("personal");

  const fetchResumeById = async (id) => {
    try {
      const res = await api.get("/resume/all");
      const resume = res.data.resumes.find((r) => r._id === id);
      if (resume) loadResumeData(resume);
    } catch (err) {
      console.error(err);
    }
  };

  const loadResumeData = (resume) => {
    setResumeId(resume._id);
    setResumeName(resume.name || "My Resume");
    const rawEdu = (resume.education || []).filter(
      (e) => e.university?.trim() || e.degree?.trim() || e.schoolName?.trim(),
    );
    // ✅ fresh defaults object for fallback values — never reused/shared
    const defaults = createDefaultResumeData();
    setResumeData({
      personalInfo: resume.personalInfo || defaults.personalInfo,
      education:
        rawEdu.length > 0
          ? rawEdu.map((e) => {
              const type =
                e.eduType || (e.schoolName?.trim() ? "school" : "university");
              if (type === "school") {
                return {
                  eduType: "school",
                  schoolName: e.schoolName || "",
                  schoolType: (e.schoolType || "Senior Secondary")
                    .replace(" (12th)", "")
                    .replace(" (10th)", ""),
                  location: e.location || "",
                  startDate: e.startDate || "",
                  endDate: e.endDate || e.year || "",
                  marks: e.marks || "",
                  board: e.board || "",
                };
              }
              return {
                eduType: "university",
                university: e.university || "",
                degree: e.degree || "",
                location: e.location || "",
                startDate: e.startDate || "",
                endDate: e.endDate || "",
                gpa: e.gpa || "",
              };
            })
          : defaults.education,
      experience:
        resume.experience?.length > 0
          ? resume.experience.map((e) => ({
              ...e,
              bullets: [...(e.bullets || []), "", "", "", "", ""].slice(0, 5),
            }))
          : defaults.experience,
      projects:
        resume.projects?.length > 0
          ? resume.projects.map((p) => ({
              name: p.name || "",
              url: p.url || "",
              techStack: p.techStack || "",
              bullets: [...(p.bullets || []), "", "", "", ""].slice(0, 4),
            }))
          : defaults.projects,
      certifications:
        resume.certifications?.length > 0
          ? resume.certifications
          : defaults.certifications,
      achievements:
        resume.achievements?.length > 0
          ? resume.achievements
          : defaults.achievements,
      skills: resume.skills || defaults.skills,
    });
  };

  // A new ?id= remounts the page (see ResumeBuilderPage), so "new resume" always
  // starts from fresh state and this only has to load an existing one.
  useEffect(() => {
    const editId = new URLSearchParams(location.search).get("id");
    if (editId) fetchResumeById(editId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per mount
  }, []);

  // ── handlers ────────────────────────────────────────────────────────────────
  const handlePersonalChange = (e) =>
    setResumeData({
      ...resumeData,
      personalInfo: {
        ...resumeData.personalInfo,
        [e.target.name]: e.target.value,
      },
    });
  const handleSkillsChange = (e) =>
    setResumeData({
      ...resumeData,
      skills: { ...resumeData.skills, [e.target.name]: e.target.value },
    });

  // ✅ FIXED — proper immutable update, no shared-reference mutation
  const handleEducationChange = (i, field, value) => {
    const u = resumeData.education.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item,
    );
    setResumeData({ ...resumeData, education: u });
  };

  const handleEduTypeToggle = (i, newType) => {
    const u = [...resumeData.education];
    u[i] =
      newType === "university"
        ? { ...defaultUniversity }
        : { ...defaultSchool };
    setResumeData({ ...resumeData, education: u });
  };

  // ✅ FIXED — proper immutable update
  const handleExperienceChange = (i, field, value) => {
    const u = resumeData.experience.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item,
    );
    setResumeData({ ...resumeData, experience: u });
  };

  // ✅ FIXED — clones both the item AND its bullets array
  const handleBulletChange = (section, i, j, value) => {
    const u = resumeData[section].map((item, idx) => {
      if (idx !== i) return item;
      const bullets = [...item.bullets];
      bullets[j] = value;
      return { ...item, bullets };
    });
    setResumeData({ ...resumeData, [section]: u });
  };

  // ✅ FIXED — proper immutable update
  const handleProjectChange = (i, field, value) => {
    const u = resumeData.projects.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item,
    );
    setResumeData({ ...resumeData, projects: u });
  };

  // ✅ FIXED — proper immutable update
  const handleCertChange = (i, field, value) => {
    const u = resumeData.certifications.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item,
    );
    setResumeData({ ...resumeData, certifications: u });
  };

  // ✅ FIXED — proper immutable update
  const handleAchievementChange = (i, field, value) => {
    const u = resumeData.achievements.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item,
    );
    setResumeData({ ...resumeData, achievements: u });
  };

  const addEducation = () =>
    setResumeData({
      ...resumeData,
      education: [...resumeData.education, { ...defaultUniversity }],
    });
  const addExperience = () =>
    setResumeData({
      ...resumeData,
      experience: [
        ...resumeData.experience,
        {
          company: "",
          role: "",
          location: "",
          startDate: "",
          endDate: "",
          bullets: ["", "", "", "", ""],
        },
      ],
    });
  const addProject = () =>
    setResumeData({
      ...resumeData,
      projects: [
        ...resumeData.projects,
        { name: "", url: "", techStack: "", bullets: ["", "", "", ""] },
      ],
    });
  const addCertification = () =>
    setResumeData({
      ...resumeData,
      certifications: [
        ...resumeData.certifications,
        { name: "", issuer: "", date: "", url: "" },
      ],
    });
  const addAchievement = () =>
    setResumeData({
      ...resumeData,
      achievements: [
        ...resumeData.achievements,
        { title: "", description: "" },
      ],
    });
  const removeItem = (section, index) =>
    setResumeData({
      ...resumeData,
      [section]: resumeData[section].filter((_, i) => i !== index),
    });

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg("");
    try {
      const payload = {
        name: resumeName,
        ...(resumeId && { resumeId }),
        ...resumeData,
        education: cleanEducationForSave(resumeData.education),
      };
      const res = await api.post("/resume/save", payload);
      if (res.data.resume) {
        setResumeId(res.data.resume._id);
        navigate(`${location.pathname}?id=${res.data.resume._id}`, {
          replace: true,
        });
      }
      setSaveMsg("✅ Resume saved!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      setSaveMsg("❌ " + (err.response?.data?.message || err.message));
    }
    setSaving(false);
  };

  const handleDownload = () => {
    const html = generatePrintHTML(resumeData, resumeName);
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) {
      alert("Please allow popups for this site");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // ── styles ───────────────────────────────────────────────────────────────────
  const inputStyle = {
    width: "100%",
    background: t.input,
    border: `1px solid ${t.inputBorder}`,
    borderRadius: "8px",
    padding: "8px 10px",
    fontSize: "13px",
    color: t.inputText,
    outline: "none",
    boxSizing: "border-box",
  };
  const labelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: "500",
    color: t.label,
    marginBottom: "4px",
  };
  const sectionCardStyle = {
    background: t.cardBg,
    border: `1px solid ${t.border}`,
    borderRadius: "10px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  };
  const addMoreBtn = {
    width: "100%",
    background: "none",
    border: `2px dashed ${t.inputBorder}`,
    borderRadius: "8px",
    padding: "10px",
    color: t.muted,
    fontSize: "13px",
    cursor: "pointer",
  };

  // shorten the last tab label on mobile so all 6 tabs fit
  const sections = [
    { id: "personal", label: "Personal" },
    { id: "education", label: "Education" },
    { id: "experience", label: "Experience" },
    { id: "projects", label: "Projects" },
    { id: "skills", label: "Skills" },
    { id: "extra", label: isMobile ? "Extra" : "Certificates & Achievements" },
  ];

  const linkedinUsername = extractLinkedInUsername(
    resumeData.personalInfo.linkedin,
  );
  const githubUsername = extractGithubUsername(resumeData.personalInfo.github);

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        height: isMobile ? "auto" : "calc(100vh - 60px)",
        minHeight: isMobile ? "calc(100vh - 60px)" : "auto",
        overflow: isMobile ? "visible" : "hidden",
        background: t.bg,
      }}
    >
      {/* ── Mobile preview overlay ─────────────────────────────────────────── */}
      {isMobile && showMobilePreview && (
        <div
          style={{
            position: "fixed",
            top: "60px",
            left: 0,
            right: 0,
            bottom: 0,
            background: isDark ? "#0f172a" : "#e2e8f0",
            zIndex: 50,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "16px 0 40px",
          }}
        >
          <div
            style={{
              width: "100%",
              padding: "0 16px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <button
              onClick={() => setShowMobilePreview(false)}
              style={{
                background: t.cardBg,
                border: `1px solid ${t.border}`,
                borderRadius: "8px",
                padding: "8px 16px",
                color: t.text,
                fontSize: "13px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              ← Back to Edit
            </button>
            <span style={{ color: t.muted, fontSize: "12px" }}>Preview</span>
          </div>

          <div
            style={{
              transform: `scale(${mobilePreviewScale})`,
              transformOrigin: "top center",
            }}
          >
            <JakesTemplate data={resumeData} />
          </div>
        </div>
      )}

      {/* ── LEFT — Form panel ─────────────────────────────────────────────────── */}
      <div
        style={{
          width: isMobile ? "100%" : "50%",
          overflowY: "auto",
          background: t.bg,
          borderRight: isMobile ? "none" : `1px solid ${t.border}`,
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            background: t.cardBg,
            borderBottom: `1px solid ${t.border}`,
            padding: "16px 20px",
            zIndex: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <h1
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: t.text,
                margin: 0,
              }}
            >
              Resume Builder
            </h1>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {isMobile && (
                <button
                  onClick={() => setShowMobilePreview(true)}
                  style={{
                    background: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "5px 12px",
                    fontSize: "12px",
                    fontWeight: "600",
                    cursor: "pointer",
                  }}
                >
                  Preview
                </button>
              )}
              <button
                onClick={() => navigate("/my-resumes")}
                style={{
                  background: "none",
                  border: `1px solid ${t.border}`,
                  borderRadius: "6px",
                  padding: "4px 12px",
                  color: t.muted,
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                {isMobile ? "Files" : "My Resumes →"}
              </button>
            </div>
          </div>

          <input
            type="text"
            value={resumeName}
            onChange={(e) => setResumeName(e.target.value)}
            style={{
              ...inputStyle,
              marginBottom: "12px",
              fontWeight: "600",
              fontSize: "14px",
            }}
            placeholder="Resume Name e.g. Frontend Resume"
          />

          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSection(s.id)}
                style={{
                  padding: isMobile ? "5px 10px" : "6px 12px",
                  borderRadius: "6px",
                  border: `1px solid ${activeSection === s.id ? "#3b82f6" : t.inputBorder}`,
                  background:
                    activeSection === s.id
                      ? isDark
                        ? "#1e3a5f"
                        : "#dbeafe"
                      : t.input,
                  color: activeSection === s.id ? "#3b82f6" : t.muted,
                  fontSize: isMobile ? "11px" : "12px",
                  fontWeight: "500",
                  cursor: "pointer",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: "20px" }}>
          {/* PERSONAL */}
          {activeSection === "personal" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <h2
                style={{
                  fontSize: "15px",
                  fontWeight: "600",
                  color: t.text,
                  margin: 0,
                }}
              >
                Personal Information
              </h2>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={resumeData.personalInfo.name || ""}
                  onChange={handlePersonalChange}
                  style={inputStyle}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="text"
                  name="email"
                  value={resumeData.personalInfo.email || ""}
                  onChange={handlePersonalChange}
                  style={inputStyle}
                  placeholder="john@gmail.com"
                />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={resumeData.personalInfo.phone || ""}
                  onChange={handlePersonalChange}
                  style={inputStyle}
                  placeholder="+91 9876543210"
                />
              </div>
              <div>
                <label style={labelStyle}>LinkedIn Username</label>
                <input
                  type="text"
                  name="linkedin"
                  value={resumeData.personalInfo.linkedin || ""}
                  onChange={handlePersonalChange}
                  style={inputStyle}
                  placeholder="johndoe"
                />
                {linkedinUsername && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: t.muted,
                      marginTop: "4px",
                    }}
                  >
                    Links to: linkedin.com/in/{linkedinUsername}
                  </p>
                )}
              </div>
              <div>
                <label style={labelStyle}>GitHub Username</label>
                <input
                  type="text"
                  name="github"
                  value={resumeData.personalInfo.github || ""}
                  onChange={handlePersonalChange}
                  style={inputStyle}
                  placeholder="johndoe"
                />
                {githubUsername && (
                  <p
                    style={{
                      fontSize: "11px",
                      color: t.muted,
                      marginTop: "4px",
                    }}
                  >
                    Links to: github.com/{githubUsername}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* EDUCATION */}
          {activeSection === "education" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2
                  style={{
                    fontSize: "15px",
                    fontWeight: "600",
                    color: t.text,
                    margin: 0,
                  }}
                >
                  Education
                </h2>
                <p style={{ fontSize: "12px", color: t.muted, margin: 0 }}>
                  Add highest education first
                </p>
              </div>
              {resumeData.education.map((edu, i) => (
                <div key={i} style={sectionCardStyle}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: t.text,
                      }}
                    >
                      Education
                    </span>
                    {resumeData.education.length > 1 && (
                      <button
                        onClick={() => removeItem("education", i)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Type</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={() => handleEduTypeToggle(i, "university")}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          borderRadius: "7px",
                          border: `1px solid ${edu.eduType !== "school" ? "#3b82f6" : t.inputBorder}`,
                          background:
                            edu.eduType !== "school"
                              ? isDark
                                ? "#1e3a5f"
                                : "#dbeafe"
                              : t.input,
                          color: edu.eduType !== "school" ? "#3b82f6" : t.muted,
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        🎓 University / College
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEduTypeToggle(i, "school")}
                        style={{
                          flex: 1,
                          padding: "8px 10px",
                          borderRadius: "7px",
                          border: `1px solid ${edu.eduType === "school" ? "#3b82f6" : t.inputBorder}`,
                          background:
                            edu.eduType === "school"
                              ? isDark
                                ? "#1e3a5f"
                                : "#dbeafe"
                              : t.input,
                          color: edu.eduType === "school" ? "#3b82f6" : t.muted,
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        🏫 School
                      </button>
                    </div>
                  </div>
                  {edu.eduType !== "school" && (
                    <>
                      {[
                        {
                          key: "university",
                          label: "University / College Name",
                          placeholder: "e.g. IIT Delhi",
                        },
                        {
                          key: "degree",
                          label: "Degree",
                          placeholder: "e.g. B.Tech Computer Science",
                        },
                        {
                          key: "location",
                          label: "Location",
                          placeholder: "e.g. Delhi",
                        },
                        {
                          key: "startDate",
                          label: "Start Year",
                          placeholder: "e.g. 2021",
                        },
                        {
                          key: "endDate",
                          label: "End Year",
                          placeholder: "e.g. 2025",
                        },
                        {
                          key: "gpa",
                          label: "GPA / CGPA (optional)",
                          placeholder: "e.g. 8.5",
                        },
                      ].map((field) => (
                        <div key={field.key}>
                          <label style={labelStyle}>{field.label}</label>
                          <input
                            type="text"
                            value={edu[field.key] || ""}
                            onChange={(e) =>
                              handleEducationChange(
                                i,
                                field.key,
                                e.target.value,
                              )
                            }
                            style={inputStyle}
                            placeholder={field.placeholder}
                          />
                        </div>
                      ))}
                    </>
                  )}
                  {edu.eduType === "school" && (
                    <>
                      <div>
                        <label style={labelStyle}>School Name</label>
                        <input
                          type="text"
                          value={edu.schoolName || ""}
                          onChange={(e) =>
                            handleEducationChange(
                              i,
                              "schoolName",
                              e.target.value,
                            )
                          }
                          style={inputStyle}
                          placeholder="e.g. Delhi Public School"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Class</label>
                        <select
                          value={edu.schoolType || "Senior Secondary"}
                          onChange={(e) =>
                            handleEducationChange(
                              i,
                              "schoolType",
                              e.target.value,
                            )
                          }
                          style={inputStyle}
                        >
                          <option value="Senior Secondary">
                            Senior Secondary
                          </option>
                          <option value="High School">High School</option>
                        </select>
                      </div>
                      <div>
                        <label style={labelStyle}>Location</label>
                        <input
                          type="text"
                          value={edu.location || ""}
                          onChange={(e) =>
                            handleEducationChange(i, "location", e.target.value)
                          }
                          style={inputStyle}
                          placeholder="e.g. Lucknow"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Start Year</label>
                        <input
                          type="text"
                          value={edu.startDate || ""}
                          onChange={(e) =>
                            handleEducationChange(
                              i,
                              "startDate",
                              e.target.value,
                            )
                          }
                          style={inputStyle}
                          placeholder="e.g. 2019"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>End Year</label>
                        <input
                          type="text"
                          value={edu.endDate || ""}
                          onChange={(e) =>
                            handleEducationChange(i, "endDate", e.target.value)
                          }
                          style={inputStyle}
                          placeholder="e.g. 2021"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Marks / Percentage</label>
                        <input
                          type="text"
                          value={edu.marks || ""}
                          onChange={(e) =>
                            handleEducationChange(i, "marks", e.target.value)
                          }
                          style={inputStyle}
                          placeholder="e.g. 92.4% or 9.2 CGPA"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Board (optional)</label>
                        <select
                          value={edu.board || ""}
                          onChange={(e) =>
                            handleEducationChange(i, "board", e.target.value)
                          }
                          style={inputStyle}
                        >
                          <option value="">Select Board (optional)</option>
                          <option value="CBSE">CBSE</option>
                          <option value="ICSE">ICSE</option>
                          <option value="ISC">ISC</option>
                          <option value="UP Board">UP Board</option>
                          <option value="Maharashtra Board">
                            Maharashtra Board
                          </option>
                          <option value="Karnataka Board">
                            Karnataka Board
                          </option>
                          <option value="Tamil Nadu Board">
                            Tamil Nadu Board
                          </option>
                          <option value="West Bengal Board">
                            West Bengal Board
                          </option>
                          <option value="Rajasthan Board">
                            Rajasthan Board
                          </option>
                          <option value="MP Board">MP Board</option>
                          <option value="Bihar Board">Bihar Board</option>
                          <option value="Other State Board">
                            Other State Board
                          </option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              ))}
              <button onClick={addEducation} style={addMoreBtn}>
                + Add Another Education
              </button>
            </div>
          )}

          {/* EXPERIENCE */}
          {activeSection === "experience" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <h2
                style={{
                  fontSize: "15px",
                  fontWeight: "600",
                  color: t.text,
                  margin: 0,
                }}
              >
                Experience
              </h2>
              {resumeData.experience.map((exp, i) => (
                <div key={i} style={sectionCardStyle}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: t.text,
                      }}
                    >
                      Experience
                    </span>
                    {resumeData.experience.length > 1 && (
                      <button
                        onClick={() => removeItem("experience", i)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {[
                    {
                      key: "role",
                      label: "Role",
                      placeholder: "Frontend Developer",
                    },
                    {
                      key: "company",
                      label: "Company",
                      placeholder: "Tech Corp",
                    },
                    {
                      key: "location",
                      label: "Location",
                      placeholder: "Remote",
                    },
                    {
                      key: "startDate",
                      label: "Start Date",
                      placeholder: "Jan 2024",
                    },
                    {
                      key: "endDate",
                      label: "End Date",
                      placeholder: "Present",
                    },
                  ].map((field) => (
                    <div key={field.key}>
                      <label style={labelStyle}>{field.label}</label>
                      <input
                        type="text"
                        value={exp[field.key] || ""}
                        onChange={(e) =>
                          handleExperienceChange(i, field.key, e.target.value)
                        }
                        style={inputStyle}
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={labelStyle}>Bullet Points (5)</label>
                    {[0, 1, 2, 3, 4].map((j) => (
                      <input
                        key={j}
                        type="text"
                        value={(exp.bullets && exp.bullets[j]) || ""}
                        onChange={(e) =>
                          handleBulletChange("experience", i, j, e.target.value)
                        }
                        style={{ ...inputStyle, marginBottom: "6px" }}
                        placeholder={`Bullet point ${j + 1}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={addExperience} style={addMoreBtn}>
                + Add Experience
              </button>
            </div>
          )}

          {/* PROJECTS */}
          {activeSection === "projects" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <h2
                style={{
                  fontSize: "15px",
                  fontWeight: "600",
                  color: t.text,
                  margin: 0,
                }}
              >
                Projects
              </h2>
              {resumeData.projects.map((proj, i) => (
                <div key={i} style={sectionCardStyle}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: t.text,
                      }}
                    >
                      Project {i + 1}
                    </span>
                    {resumeData.projects.length > 1 && (
                      <button
                        onClick={() => removeItem("projects", i)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#ef4444",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Project Name</label>
                    <input
                      type="text"
                      value={proj.name || ""}
                      onChange={(e) =>
                        handleProjectChange(i, "name", e.target.value)
                      }
                      style={inputStyle}
                      placeholder="e.g. Job Portal"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Project URL (optional)</label>
                    <input
                      type="text"
                      value={proj.url || ""}
                      onChange={(e) =>
                        handleProjectChange(i, "url", e.target.value)
                      }
                      style={inputStyle}
                      placeholder="e.g. github.com/johndoe/job-portal"
                    />
                    <p
                      style={{
                        fontSize: "11px",
                        color: t.muted,
                        marginTop: "4px",
                      }}
                    >
                      If added, project name becomes clickable and opens this
                      link
                    </p>
                  </div>
                  <div>
                    <label style={labelStyle}>Tech Stack</label>
                    <input
                      type="text"
                      value={proj.techStack || ""}
                      onChange={(e) =>
                        handleProjectChange(i, "techStack", e.target.value)
                      }
                      style={inputStyle}
                      placeholder="e.g. React, Node.js, MongoDB"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Bullet Points (4)</label>
                    {[0, 1, 2, 3].map((j) => (
                      <input
                        key={j}
                        type="text"
                        value={(proj.bullets && proj.bullets[j]) || ""}
                        onChange={(e) =>
                          handleBulletChange("projects", i, j, e.target.value)
                        }
                        style={{ ...inputStyle, marginBottom: "6px" }}
                        placeholder={`Bullet point ${j + 1}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={addProject} style={addMoreBtn}>
                + Add Project
              </button>
            </div>
          )}

          {/* SKILLS */}
          {activeSection === "skills" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              <h2
                style={{
                  fontSize: "15px",
                  fontWeight: "600",
                  color: t.text,
                  margin: 0,
                }}
              >
                Technical Skills
              </h2>
              {[
                {
                  name: "languages",
                  label: "Languages",
                  placeholder: "Python, JavaScript, Java",
                },
                {
                  name: "frameworks",
                  label: "Frameworks",
                  placeholder: "React, Node.js, Express",
                },
                {
                  name: "tools",
                  label: "Tools",
                  placeholder: "Git, Docker, MongoDB",
                },
                {
                  name: "libraries",
                  label: "Libraries",
                  placeholder: "TailwindCSS, Mongoose",
                },
              ].map((field) => (
                <div key={field.name}>
                  <label style={labelStyle}>{field.label}</label>
                  <input
                    type="text"
                    name={field.name}
                    value={resumeData.skills[field.name] || ""}
                    onChange={handleSkillsChange}
                    style={inputStyle}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
          )}

          {/* CERTIFICATES & ACHIEVEMENTS */}
          {activeSection === "extra" && (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <h2
                  style={{
                    fontSize: "15px",
                    fontWeight: "600",
                    color: t.text,
                    margin: 0,
                  }}
                >
                  Certifications
                </h2>
                {resumeData.certifications.map((cert, i) => (
                  <div key={i} style={sectionCardStyle}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: t.text,
                        }}
                      >
                        Certification {i + 1}
                      </span>
                      {resumeData.certifications.length > 1 && (
                        <button
                          onClick={() => removeItem("certifications", i)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {[
                      {
                        key: "name",
                        label: "Certificate Name",
                        placeholder: "AWS Certified Developer",
                      },
                      {
                        key: "issuer",
                        label: "Issuing Organization",
                        placeholder: "Amazon Web Services",
                      },
                      { key: "date", label: "Date", placeholder: "Jan 2024" },
                      {
                        key: "url",
                        label: "Certificate URL (optional)",
                        placeholder: "https://...",
                      },
                    ].map((field) => (
                      <div key={field.key}>
                        <label style={labelStyle}>{field.label}</label>
                        <input
                          type="text"
                          value={cert[field.key] || ""}
                          onChange={(e) =>
                            handleCertChange(i, field.key, e.target.value)
                          }
                          style={inputStyle}
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))}
                  </div>
                ))}
                <button onClick={addCertification} style={addMoreBtn}>
                  + Add Certification
                </button>
              </div>

              <div style={{ borderTop: `1px solid ${t.border}` }} />

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <h2
                  style={{
                    fontSize: "15px",
                    fontWeight: "600",
                    color: t.text,
                    margin: 0,
                  }}
                >
                  Achievements
                </h2>
                {resumeData.achievements.map((ach, i) => (
                  <div key={i} style={sectionCardStyle}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: t.text,
                        }}
                      >
                        Achievement {i + 1}
                      </span>
                      {resumeData.achievements.length > 1 && (
                        <button
                          onClick={() => removeItem("achievements", i)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#ef4444",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div>
                      <label style={labelStyle}>Title</label>
                      <input
                        type="text"
                        value={ach.title || ""}
                        onChange={(e) =>
                          handleAchievementChange(i, "title", e.target.value)
                        }
                        style={inputStyle}
                        placeholder="e.g. Hackathon Winner"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Description (optional)</label>
                      <input
                        type="text"
                        value={ach.description || ""}
                        onChange={(e) =>
                          handleAchievementChange(
                            i,
                            "description",
                            e.target.value,
                          )
                        }
                        style={inputStyle}
                        placeholder="e.g. Won 1st place among 200 teams"
                      />
                    </div>
                  </div>
                ))}
                <button onClick={addAchievement} style={addMoreBtn}>
                  + Add Achievement
                </button>
              </div>
            </div>
          )}

          {/* Save / PDF buttons */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "24px",
              paddingBottom: "32px",
            }}
          >
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                flex: 1,
                background: saving ? "#93c5fd" : "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving
                ? "Saving..."
                : resumeId
                  ? "Update Resume"
                  : "Save Resume"}
            </button>
            <button
              onClick={handleDownload}
              style={{
                flex: 1,
                background: "#22c55e",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "10px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Save as PDF
            </button>
          </div>

          {saveMsg && (
            <p
              style={{
                textAlign: "center",
                fontSize: "14px",
                color: saveMsg.includes("✅") ? "#22c55e" : "#ef4444",
                marginTop: "8px",
              }}
            >
              {saveMsg}
            </p>
          )}
        </div>
      </div>

      {/* ── RIGHT — Desktop preview only ───────────────────── */}
      {!isMobile && (
        <div
          style={{
            width: "50%",
            overflowY: "auto",
            background: isDark ? "#0f172a" : "#e2e8f0",
            padding: "24px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{ transform: "scale(0.75)", transformOrigin: "top center" }}
          >
            <JakesTemplate data={resumeData} />
          </div>
        </div>
      )}
    </div>
  );
};

// Keyed by the query string so switching between resumes, or to a new one,
// gives a clean component instead of resetting a dozen pieces of state.
const ResumeBuilderPage = () => {
  const location = useLocation();
  return <ResumeBuilder key={location.search} />;
};

export default ResumeBuilderPage;
