import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../services/api", () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: { user: { id: "1", name: "New Name", role: "jobseeker" } } }),
    delete: vi.fn(),
  },
  errorMessage: (err, fallback) => err?.response?.data?.message || fallback,
}));

import api from "../services/api";
import Profile from "../pages/Profile";
import { AuthProvider } from "../context/AuthContext";
import { ThemeProvider } from "../context/ThemeContext";

describe("Profile page", () => {
  test("saving the name calls the API route that exists (PUT /auth/profile) [BUG-5]", async () => {
    localStorage.setItem("user", JSON.stringify({ id: "1", name: "Old", email: "a@b.co", role: "jobseeker" }));
    localStorage.setItem("token", "t");
    render(
      <MemoryRouter>
        <ThemeProvider>
          <AuthProvider>
            <Profile />
          </AuthProvider>
        </ThemeProvider>
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByPlaceholderText("Your full name"), { target: { value: "New Name" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith("/auth/profile", expect.objectContaining({ name: "New Name" })));
    expect(await screen.findByText("Profile updated successfully!")).toBeInTheDocument();
  });
});
