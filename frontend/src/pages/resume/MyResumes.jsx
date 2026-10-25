import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { useTheme } from "../../context/ThemeContext";
import { getThemeStyles } from "../../utils/theme";
import { useIsMobile } from "../../hooks/useIsMobile";

const RESUMES_PER_PAGE = 6;

// ── pagination component ──────────────────────────────────────────────────────
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
    minWidth: "34px",
    height: "34px",
    border: `1px solid ${t.border}`,
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
        ←
      </button>

      {getPageNumbers().map((page, i) =>
        page === "..." ? (
          <span
            key={`dots-${i}`}
            style={{ color: t.muted, fontSize: "14px", padding: "0 2px" }}
          >
            …
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
                  : `1px solid ${t.border}`,
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
        →
      </button>
    </div>
  );
};

// ── main component ────────────────────────────────────────────────────────────
const MyResumes = () => {
  const { isDark } = useTheme();
  const t = getThemeStyles(isDark);
  const navigate = useNavigate();
  const isMobile = useIsMobile(640);

  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  // ── pagination state ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResumes, setTotalResumes] = useState(0);

  const fetchResumes = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get(
        `/resume/all?page=${page}&limit=${RESUMES_PER_PAGE}`,
      );
      setResumes(res.data.resumes);
      setCurrentPage(res.data.currentPage || 1);
      setTotalPages(res.data.totalPages || 1);
      setTotalResumes(res.data.totalResumes || 0);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data load
    fetchResumes(1);
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this resume?")) return;
    setDeleting(id);
    try {
      await api.delete(`/resume/${id}`);
      // re-fetch current page after delete
      // if page is now empty and not page 1, go back one page
      const newTotal = totalResumes - 1;
      const newTotalPages = Math.ceil(newTotal / RESUMES_PER_PAGE);
      const pageToFetch =
        currentPage > newTotalPages ? Math.max(1, newTotalPages) : currentPage;
      fetchResumes(pageToFetch);
    } catch (err) {
      alert(errorMessage(err, "Failed to delete resume"));
    }
    setDeleting(null);
  };

  const handleView = (id) => navigate(`/resume/view/${id}`);
  const handleEdit = (id) => navigate(`/resume/builder?id=${id}`);
  const handleCreateNew = () => navigate("/resume/builder");

  const handlePageChange = (page) => {
    fetchResumes(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading)
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
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: isMobile ? "22px" : "28px",
                fontWeight: "700",
                color: t.text,
                margin: "0 0 4px",
              }}
            >
              My Resumes
            </h1>
            <p style={{ color: t.muted, fontSize: "13px", margin: 0 }}>
              {totalResumes > 0
                ? `${totalResumes} resume${totalResumes !== 1 ? "s" : ""} saved`
                : isMobile
                  ? "Select one when applying"
                  : "All your saved resumes — select one when applying to jobs"}
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            style={{
              background: "#3b82f6",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: isMobile ? "8px 14px" : "10px 20px",
              fontSize: isMobile ? "13px" : "14px",
              fontWeight: "600",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            + Create New
          </button>
        </div>

        {/* Empty state */}
        {resumes.length === 0 && totalResumes === 0 ? (
          <div
            style={{
              background: t.cardBg,
              border: `1px solid ${t.border}`,
              borderRadius: "12px",
              padding: "48px",
              textAlign: "center",
            }}
          >
            <p style={{ fontSize: "40px", margin: "0 0 16px" }}>📄</p>
            <p style={{ color: t.muted, marginBottom: "20px" }}>
              No resumes yet. Create your first resume!
            </p>
            <button
              onClick={handleCreateNew}
              style={{
                background: "#3b82f6",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Build Resume
            </button>
          </div>
        ) : (
          <>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {resumes.map((resume, i) => {
                // "Latest" badge only on the very first resume (page 1, index 0)
                const isLatest = currentPage === 1 && i === 0;
                return (
                  <div
                    key={resume._id}
                    style={{
                      background: t.cardBg,
                      border: `1px solid ${t.border}`,
                      borderRadius: "12px",
                      padding: isMobile ? "16px" : "20px",
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent: "space-between",
                      alignItems: isMobile ? "flex-start" : "center",
                      gap: isMobile ? "14px" : "0",
                    }}
                  >
                    {/* Resume info */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          marginBottom: "4px",
                        }}
                      >
                        <span style={{ fontSize: "20px" }}>📄</span>
                        <h3
                          style={{
                            fontSize: "16px",
                            fontWeight: "600",
                            color: t.text,
                            margin: 0,
                          }}
                        >
                          {resume.name || "My Resume"}
                        </h3>
                        {isLatest && (
                          <span
                            style={{
                              background: isDark ? "#1e3a5f" : "#dbeafe",
                              color: "#3b82f6",
                              padding: "2px 10px",
                              borderRadius: "999px",
                              fontSize: "11px",
                              fontWeight: "600",
                            }}
                          >
                            Latest
                          </span>
                        )}
                      </div>
                      <p
                        style={{
                          color: t.muted,
                          fontSize: "13px",
                          margin: "0 0 2px",
                          paddingLeft: "30px",
                        }}
                      >
                        {resume.personalInfo?.name} • Updated{" "}
                        {new Date(resume.updatedAt).toLocaleDateString()}
                      </p>
                      {resume.skills?.languages && (
                        <p
                          style={{
                            color: t.muted,
                            fontSize: "12px",
                            margin: "2px 0 0",
                            paddingLeft: "30px",
                          }}
                        >
                          Skills:{" "}
                          {resume.skills.languages
                            .split(",")
                            .slice(0, 3)
                            .join(", ")}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        width: isMobile ? "100%" : "auto",
                        marginLeft: isMobile ? "0" : "16px",
                      }}
                    >
                      <button
                        onClick={() => handleView(resume._id)}
                        style={{
                          flex: isMobile ? 1 : "none",
                          background: "none",
                          border: `1px solid ${t.border}`,
                          borderRadius: "6px",
                          padding: isMobile ? "8px 0" : "6px 12px",
                          color: "#3b82f6",
                          fontSize: "13px",
                          cursor: "pointer",
                          fontWeight: "500",
                        }}
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(resume._id)}
                        style={{
                          flex: isMobile ? 1 : "none",
                          background: "none",
                          border: `1px solid ${t.border}`,
                          borderRadius: "6px",
                          padding: isMobile ? "8px 0" : "6px 12px",
                          color: t.muted,
                          fontSize: "13px",
                          cursor: "pointer",
                          fontWeight: "500",
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(resume._id)}
                        disabled={deleting === resume._id}
                        style={{
                          flex: isMobile ? 1 : "none",
                          background: isMobile
                            ? isDark
                              ? "#2d1515"
                              : "#fef2f2"
                            : "none",
                          border: isMobile ? "1px solid #f87171" : "none",
                          borderRadius: "6px",
                          padding: isMobile ? "8px 0" : "6px 4px",
                          color: "#ef4444",
                          fontSize: "13px",
                          cursor:
                            deleting === resume._id ? "not-allowed" : "pointer",
                          opacity: deleting === resume._id ? 0.5 : 1,
                          fontWeight: "500",
                        }}
                      >
                        {deleting === resume._id ? "..." : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              isDark={isDark}
              t={t}
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
                Page {currentPage} of {totalPages} · {totalResumes} total
                resumes
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyResumes;
