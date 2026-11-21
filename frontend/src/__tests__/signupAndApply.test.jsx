import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";

vi.mock("../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
  errorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));

import api from "../services/api";
import Register from "../pages/Register";
import Landing from "../pages/Landing";
import JobDetail from "../pages/jobs/JobDetail";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

const Where = () => <p data-testid="where">{useLocation().pathname + useLocation().search}</p>;

const renderAt = (path, routes) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <AuthProvider>
          <Routes>{routes}</Routes>
          <Where />
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  );

describe("signing up as a recruiter [BUG-A]", () => {
  test("the landing page's Sign Up as Recruiter button links with the recruiter role", () => {
    renderAt("/", [<Route key="l" path="/" element={<Landing />} />, <Route key="r" path="/register" element={<p>form</p>} />]);
    fireEvent.click(screen.getByRole("button", { name: "Sign Up as Recruiter" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/register?role=recruiter");
  });

  test("the signup form pre-selects Recruiter from ?role=recruiter", () => {
    renderAt("/register?role=recruiter", [<Route key="r" path="/register" element={<Register />} />]);
    expect(screen.getByRole("combobox")).toHaveValue("recruiter");
  });

  test("without a role, or with an unknown one, it defaults to Job Seeker", () => {
    renderAt("/register?role=admin", [<Route key="r" path="/register" element={<Register />} />]);
    expect(screen.getByRole("combobox")).toHaveValue("jobseeker");
  });
});

describe("applying for a job [BUG-B]", () => {
  beforeEach(() => {
    localStorage.setItem("user", JSON.stringify({ id: "s1", name: "Asha", role: "jobseeker" }));
    localStorage.setItem("token", "t");
    const job = {
      _id: "j1", title: "MERN Developer", company: "Zeta", location: "Pune", description: "Build things",
      skills: ["React"], status: "active", deadline: null, salary: "8 LPA", applicationCount: 0,
      recruiterId: { _id: "r1", name: "Riya", email: "r@x.com" },
    };
    api.get.mockImplementation((url) => {
      if (url.startsWith("/jobs/")) return Promise.resolve({ data: { job } });
      if (url.startsWith("/applications/check/")) return Promise.resolve({ data: { applied: false } });
      if (url.startsWith("/resume/all")) return Promise.resolve({ data: { resumes: [{ _id: "res1", name: "My CV", updatedAt: new Date().toISOString() }] } });
      return Promise.resolve({ data: { jobIds: [] } });
    });
    api.post.mockResolvedValue({ data: { success: true } });
  });

  test("shows 'Application submitted successfully!' right after applying", async () => {
    renderAt("/jobs/j1", [<Route key="j" path="/jobs/:id" element={<JobDetail />} />]);
    fireEvent.click(await screen.findByRole("button", { name: "Apply Now" }));
    expect(await screen.findByText("Application submitted successfully!")).toBeInTheDocument();
    expect(screen.queryByText("You have already applied for this job")).toBeNull();
    expect(api.post).toHaveBeenCalledWith("/applications/apply-saved", { jobId: "j1", resumeId: "res1" });
  });

  test("on a later visit it says the user already applied", async () => {
    api.get.mockImplementation((url) => {
      if (url.startsWith("/applications/check/")) return Promise.resolve({ data: { applied: true } });
      if (url.startsWith("/jobs/")) return Promise.resolve({ data: { job: { _id: "j1", title: "MERN Developer", company: "Zeta", location: "Pune", description: "x", skills: [], status: "active", recruiterId: { _id: "r1" } } } });
      return Promise.resolve({ data: { resumes: [], jobIds: [] } });
    });
    renderAt("/jobs/j1", [<Route key="j" path="/jobs/:id" element={<JobDetail />} />]);
    expect(await screen.findByText("You have already applied for this job")).toBeInTheDocument();
  });
});
