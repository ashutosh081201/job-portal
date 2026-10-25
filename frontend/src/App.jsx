import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/shared/Navbar";
import ProtectedRoute from "./components/shared/ProtectedRoute";
import Landing from "./pages/Landing";
import Register from "./pages/Register";
import VerifyOTP from "./pages/VerifyOTP";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import VerifyForgotOTP from "./pages/VerifyForgotOTP";
import ResetPassword from "./pages/ResetPassword";
import JobListings from "./pages/jobs/JobListings";
import JobDetail from "./pages/jobs/JobDetail";
import PostJob from "./pages/jobs/PostJob";
import EditJob from "./pages/jobs/EditJob";
import RecruiterDashboard from "./pages/dashboard/RecruiterDashboard";
import JobSeekerDashboard from "./pages/dashboard/JobSeekerDashboard";
import ResumeBuilder from "./pages/resume/ResumeBuilder";
import MyResumes from "./pages/resume/MyResumes";
import ViewResume from "./pages/resume/ViewResume";
import ATSChecker from "./pages/ats/ATSChecker";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import PDFViewer from "./pages/PDFViewer"; // ← NEW

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-forgot-otp" element={<VerifyForgotOTP />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/jobs" element={<JobListings />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/resume/view/:id" element={<ViewResume />} />
        <Route path="/pdf-viewer" element={<PDFViewer />} /> {/* ← NEW */}
        <Route
          path="/post-job"
          element={
            <ProtectedRoute role="recruiter">
              <PostJob />
            </ProtectedRoute>
          }
        />
        <Route
          path="/edit-job/:id"
          element={
            <ProtectedRoute role="recruiter">
              <EditJob />
            </ProtectedRoute>
          }
        />
        <Route
          path="/recruiter/dashboard"
          element={
            <ProtectedRoute role="recruiter">
              <RecruiterDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="jobseeker">
              <JobSeekerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resume/builder"
          element={
            <ProtectedRoute role="jobseeker">
              <ResumeBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-resumes"
          element={
            <ProtectedRoute role="jobseeker">
              <MyResumes />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ats"
          element={
            <ProtectedRoute role="jobseeker">
              <ATSChecker />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
