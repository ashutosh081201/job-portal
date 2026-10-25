import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 52,
    paddingRight: 52,
    fontFamily: "Times-Roman",
    fontSize: 11,
    color: "#000",
    lineHeight: 1.45,
    backgroundColor: "#ffffff",
  },
  name: {
    fontSize: 22,
    fontFamily: "Times-Bold",
    textAlign: "center",
    marginBottom: 3,
    letterSpacing: 0.5,
  },
  contact: {
    fontSize: 10.5,
    textAlign: "center",
    marginBottom: 10,
  },
  section: {
    marginBottom: 6,
  },
  sectionHeaderBox: {
    borderBottomWidth: 1.2,
    borderBottomColor: "#000",
    borderBottomStyle: "solid",
    marginBottom: 5,
    paddingBottom: 1,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontFamily: "Times-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 1,
  },
  leftText: {
    flex: 1,
  },
  rightText: {
    textAlign: "right",
  },
  bold: {
    fontFamily: "Times-Bold",
  },
  italic: {
    fontFamily: "Times-Italic",
  },
  entryContainer: {
    marginBottom: 5,
  },
  bulletList: {
    paddingLeft: 10,
    marginTop: 2,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 1,
  },
  bulletDot: {
    width: 12,
  },
  bulletText: {
    flex: 1,
  },
});

const SectionHeader = ({ title }) => (
  <View style={styles.sectionHeaderBox}>
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const BulletList = ({ bullets }) => {
  const filtered = (bullets || []).filter((b) => b);
  if (filtered.length === 0) return null;
  return (
    <View style={styles.bulletList}>
      {filtered.map((bullet, i) => (
        <View key={i} style={styles.bulletItem}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{bullet}</Text>
        </View>
      ))}
    </View>
  );
};

const ResumePDF = ({ data }) => {
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

  const contactParts = [
    personal.phone,
    personal.email,
    personal.linkedin,
    personal.github,
  ]
    .filter(Boolean)
    .join(" | ");

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <Text style={styles.name}>{personal.name || "Your Name"}</Text>
        {contactParts ? (
          <Text style={styles.contact}>{contactParts}</Text>
        ) : null}

        {/* EDUCATION */}
        {education.filter((e) => e.university || e.degree).length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Education" />
            {education
              .filter((e) => e.university || e.degree)
              .map((edu, i) => (
                <View key={i} style={{ marginBottom: 3 }}>
                  <View style={styles.row}>
                    <Text style={[styles.leftText, styles.bold]}>
                      {edu.university || ""}
                    </Text>
                    <Text style={styles.rightText}>{edu.location || ""}</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.leftText, styles.italic]}>
                      {edu.degree || ""}
                      {edu.gpa ? ` | GPA: ${edu.gpa}` : ""}
                    </Text>
                    <Text style={styles.rightText}>
                      {edu.startDate || ""}
                      {edu.endDate ? ` – ${edu.endDate}` : ""}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* EXPERIENCE */}
        {experience.filter((e) => e.company || e.role).length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Experience" />
            {experience
              .filter((e) => e.company || e.role)
              .map((exp, i) => (
                <View key={i} style={styles.entryContainer}>
                  <View style={styles.row}>
                    <Text style={[styles.leftText, styles.bold]}>
                      {exp.role || ""}
                    </Text>
                    <Text style={styles.rightText}>
                      {exp.startDate || ""}
                      {exp.endDate ? ` – ${exp.endDate}` : ""}
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={[styles.leftText, styles.italic]}>
                      {exp.company || ""}
                    </Text>
                    <Text style={styles.rightText}>{exp.location || ""}</Text>
                  </View>
                  <BulletList bullets={exp.bullets} />
                </View>
              ))}
          </View>
        )}

        {/* PROJECTS */}
        {projects.filter((p) => p.name).length > 0 && (
          <View style={styles.section}>
            <SectionHeader title="Projects" />
            {projects
              .filter((p) => p.name)
              .map((proj, i) => (
                <View key={i} style={styles.entryContainer}>
                  <Text style={{ marginBottom: 1 }}>
                    <Text style={styles.bold}>{proj.name || ""}</Text>
                    {proj.techStack ? (
                      <Text style={styles.italic}> | {proj.techStack}</Text>
                    ) : null}
                  </Text>
                  <BulletList bullets={proj.bullets} />
                </View>
              ))}
          </View>
        )}

        {/* TECHNICAL SKILLS */}
        {(skills.languages ||
          skills.frameworks ||
          skills.tools ||
          skills.libraries) && (
          <View style={styles.section}>
            <SectionHeader title="Technical Skills" />
            <View style={{ paddingLeft: 2 }}>
              {skills.languages ? (
                <Text style={{ marginBottom: 2 }}>
                  <Text style={styles.bold}>Languages: </Text>
                  <Text>{skills.languages}</Text>
                </Text>
              ) : null}
              {skills.frameworks ? (
                <Text style={{ marginBottom: 2 }}>
                  <Text style={styles.bold}>Frameworks: </Text>
                  <Text>{skills.frameworks}</Text>
                </Text>
              ) : null}
              {skills.tools ? (
                <Text style={{ marginBottom: 2 }}>
                  <Text style={styles.bold}>Tools: </Text>
                  <Text>{skills.tools}</Text>
                </Text>
              ) : null}
              {skills.libraries ? (
                <Text style={{ marginBottom: 2 }}>
                  <Text style={styles.bold}>Libraries: </Text>
                  <Text>{skills.libraries}</Text>
                </Text>
              ) : null}
            </View>
          </View>
        )}

        {/* CERTIFICATIONS & ACHIEVEMENTS */}
        {hasCertsOrAchievements && (
          <View style={styles.section}>
            <SectionHeader title="Certifications & Achievements" />

            {certifications.map((cert, i) => (
              <View key={`cert-${i}`} style={{ marginBottom: 4 }}>
                <View style={styles.row}>
                  <Text style={[styles.leftText, styles.bold]}>
                    {cert.name || ""}
                  </Text>
                  <Text style={styles.rightText}>{cert.date || ""}</Text>
                </View>
                {cert.issuer ? (
                  <Text style={styles.italic}>
                    {cert.issuer}
                    {cert.url ? ` — ${cert.url}` : ""}
                  </Text>
                ) : null}
              </View>
            ))}

            {achievements.map((ach, i) => (
              <View key={`ach-${i}`} style={{ marginBottom: 2 }}>
                <Text>
                  <Text style={styles.bold}>{ach.title || ""}</Text>
                  {ach.description ? <Text> — {ach.description}</Text> : null}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
};

export default ResumePDF;
