import { normalizeUrl, extractLinkedInUsername, extractGithubUsername } from "../../utils/links";

const linkStyle = { color: "inherit", textDecoration: "none" };

const JakesTemplate = ({ data }) => {
  if (!data) return null;

  const personal = data.personalInfo || {};
  const education = data.education || [];
  const experience = data.experience || [];
  const projects = data.projects || [];
  const skills = data.skills || {};
  const certifications = (data.certifications || []).filter((c) => c.name);
  const achievements = (data.achievements || []).filter((a) => a.title);
  const hasCertsOrAchievements =
    certifications.length > 0 || achievements.length > 0;

  // filter out empty education entries
  const validEducation = education.filter(
    (e) => e.university?.trim() || e.degree?.trim() || e.schoolName?.trim(),
  );

  // contact line:
  // phone → plain text
  // email → mailto link (full email as text)
  // linkedin → shows username only, links to linkedin.com/in/<username>
  // github → shows username only, links to github.com/<username>
  const contactItems = [];
  if (personal.phone) {
    contactItems.push({ text: personal.phone, href: null });
  }
  if (personal.email) {
    contactItems.push({
      text: personal.email,
      href: `mailto:${personal.email}`,
    });
  }
  if (personal.linkedin) {
    const username = extractLinkedInUsername(personal.linkedin);
    if (username)
      contactItems.push({
        text: username,
        href: `https://www.linkedin.com/in/${username}`,
      });
  }
  if (personal.github) {
    const username = extractGithubUsername(personal.github);
    if (username)
      contactItems.push({
        text: username,
        href: `https://github.com/${username}`,
      });
  }

  return (
    <div
      id="resume-template"
      style={{
        width: "794px",
        padding: "40px 52px",
        fontFamily: "Times New Roman, serif",
        fontSize: "11px",
        color: "#000",
        background: "#fff",
        lineHeight: "1.45",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div style={{ textAlign: "center", paddingBottom: "10px" }}>
        <h1
          style={{
            fontSize: "22px",
            margin: "0 0 4px 0",
            fontWeight: "bold",
            letterSpacing: "0.5px",
          }}
        >
          {personal.name || "Your Name"}
        </h1>
        <p style={{ margin: 0, fontSize: "10.5px" }}>
          {contactItems.map((item, idx) => (
            <span key={idx}>
              {idx > 0 && " | "}
              {item.href ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={linkStyle}
                >
                  {item.text}
                </a>
              ) : (
                item.text
              )}
            </span>
          ))}
        </p>
      </div>

      {/* EDUCATION */}
      {validEducation.length > 0 && (
        <div style={{ paddingBottom: "6px" }}>
          <SectionHeader title="Education" />
          {validEducation.map((edu, i) => (
            <div key={i} style={{ paddingBottom: "4px" }}>
              {edu.eduType === "school" ? (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                  }}
                >
                  <tbody>
                    <tr>
                      <td style={{ textAlign: "left", width: "70%" }}>
                        <strong>{edu.schoolName || ""}</strong>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          width: "30%",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {edu.location || ""}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: "left", width: "70%" }}>
                        <em>
                          {edu.schoolType || ""}
                          {edu.marks ? ` | ${edu.marks}` : ""}
                          {edu.board ? ` | ${edu.board}` : ""}
                        </em>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          width: "30%",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {edu.startDate && edu.endDate
                          ? `${edu.startDate} – ${edu.endDate}`
                          : edu.endDate || edu.startDate || edu.year || ""}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                  }}
                >
                  <tbody>
                    <tr>
                      <td style={{ textAlign: "left", width: "70%" }}>
                        <strong>{edu.university || ""}</strong>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          width: "30%",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {edu.location || ""}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: "left", width: "70%" }}>
                        <em>
                          {edu.degree || ""}
                          {edu.gpa ? ` | GPA: ${edu.gpa}` : ""}
                        </em>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          width: "30%",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {edu.startDate || ""}
                        {edu.endDate ? ` – ${edu.endDate}` : ""}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      )}

      {/* EXPERIENCE */}
      {experience.filter((e) => e.company || e.role).length > 0 && (
        <div style={{ paddingBottom: "6px" }}>
          <SectionHeader title="Experience" />
          {experience
            .filter((e) => e.company || e.role)
            .map((exp, i) => (
              <div key={i} style={{ paddingBottom: "6px" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    tableLayout: "fixed",
                  }}
                >
                  <tbody>
                    <tr>
                      <td style={{ textAlign: "left", width: "70%" }}>
                        <strong>{exp.role || ""}</strong>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          width: "30%",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {exp.startDate || ""}
                        {exp.endDate ? ` – ${exp.endDate}` : ""}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ textAlign: "left", width: "70%" }}>
                        <em>{exp.company || ""}</em>
                      </td>
                      <td
                        style={{
                          textAlign: "right",
                          width: "30%",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {exp.location || ""}
                      </td>
                    </tr>
                  </tbody>
                </table>
                {(exp.bullets || []).filter((b) => b).length > 0 && (
                  <ul
                    style={{
                      margin: "0",
                      paddingTop: "3px",
                      paddingLeft: "20px",
                    }}
                  >
                    {exp.bullets
                      .filter((b) => b)
                      .map((bullet, j) => (
                        <li key={j} style={{ paddingBottom: "2px" }}>
                          {bullet}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
        </div>
      )}

      {/* PROJECTS */}
      {projects.filter((p) => p.name).length > 0 && (
        <div style={{ paddingBottom: "6px" }}>
          <SectionHeader title="Projects" />
          {projects
            .filter((p) => p.name)
            .map((proj, i) => (
              <div key={i} style={{ paddingBottom: "6px" }}>
                <p style={{ margin: "0 0 2px 0" }}>
                  {proj.url ? (
                    <a
                      href={normalizeUrl(proj.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      <strong>{proj.name || ""}</strong>
                    </a>
                  ) : (
                    <strong>{proj.name || ""}</strong>
                  )}
                  {proj.techStack && <em> | {proj.techStack}</em>}
                </p>
                {(proj.bullets || []).filter((b) => b).length > 0 && (
                  <ul
                    style={{
                      margin: "0",
                      paddingTop: "2px",
                      paddingLeft: "20px",
                    }}
                  >
                    {proj.bullets
                      .filter((b) => b)
                      .map((bullet, j) => (
                        <li key={j} style={{ paddingBottom: "2px" }}>
                          {bullet}
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
        </div>
      )}

      {/* TECHNICAL SKILLS */}
      {(skills.languages ||
        skills.frameworks ||
        skills.tools ||
        skills.libraries) && (
        <div style={{ paddingBottom: "6px" }}>
          <SectionHeader title="Technical Skills" />
          <div style={{ paddingLeft: "2px" }}>
            {skills.languages && (
              <p style={{ margin: "0", paddingBottom: "2px" }}>
                <strong>Languages:</strong> {skills.languages}
              </p>
            )}
            {skills.frameworks && (
              <p style={{ margin: "0", paddingBottom: "2px" }}>
                <strong>Frameworks:</strong> {skills.frameworks}
              </p>
            )}
            {skills.tools && (
              <p style={{ margin: "0", paddingBottom: "2px" }}>
                <strong>Tools:</strong> {skills.tools}
              </p>
            )}
            {skills.libraries && (
              <p style={{ margin: "0", paddingBottom: "2px" }}>
                <strong>Libraries:</strong> {skills.libraries}
              </p>
            )}
          </div>
        </div>
      )}

      {/* CERTIFICATIONS & ACHIEVEMENTS */}
      {hasCertsOrAchievements && (
        <div style={{ paddingBottom: "6px" }}>
          <SectionHeader title="Certifications & Achievements" />

          {certifications.map((cert, i) => (
            <div key={`cert-${i}`} style={{ paddingBottom: "4px" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                }}
              >
                <tbody>
                  <tr>
                    <td style={{ textAlign: "left", width: "70%" }}>
                      <strong>{cert.name || ""}</strong>
                    </td>
                    <td
                      style={{
                        textAlign: "right",
                        width: "30%",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cert.date || ""}
                    </td>
                  </tr>
                </tbody>
              </table>
              {(cert.issuer || cert.url) && (
                <p style={{ margin: "0", paddingTop: "1px" }}>
                  {cert.issuer && <em>{cert.issuer}</em>}
                  {cert.url && (
                    <span>
                      {" "}
                      —{" "}
                      <a
                        href={normalizeUrl(cert.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "inherit",
                          textDecoration: "underline",
                        }}
                      >
                        Click Here
                      </a>
                    </span>
                  )}
                </p>
              )}
            </div>
          ))}

          {achievements.map((ach, i) => (
            <div key={`ach-${i}`} style={{ paddingBottom: "3px" }}>
              <p style={{ margin: "0", paddingBottom: "2px" }}>
                <strong>{ach.title || ""}</strong>
                {ach.description && <span> — {ach.description}</span>}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SectionHeader = ({ title }) => (
  <div style={{ borderBottom: "1.2px solid black", paddingBottom: "1px" }}>
    <h2
      style={{
        fontSize: "11.5px",
        textTransform: "uppercase",
        letterSpacing: "0.8px",
        margin: "0",
        padding: "0",
        fontWeight: "bold",
        fontFamily: "Times New Roman, serif",
      }}
    >
      {title}
    </h2>
  </div>
);

export default JakesTemplate;
