import { describe, test, expect } from "vitest";
import { renderHook, act, render, screen } from "@testing-library/react";
import { useIsMobile } from "../hooks/useIsMobile";
import { useWindowWidth } from "../hooks/useWindowWidth";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ThemeProvider, useTheme } from "../context/ThemeContext";

const resize = (w) =>
  act(() => {
    window.innerWidth = w;
    window.dispatchEvent(new Event("resize"));
  });

describe("useIsMobile / useWindowWidth", () => {
  test("tracks resizes around the default 768px breakpoint", () => {
    resize(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
    resize(767);
    expect(result.current).toBe(true);
    resize(768);
    expect(result.current).toBe(false);
  });
  test("custom breakpoint", () => {
    resize(700);
    const { result } = renderHook(() => useIsMobile(640));
    expect(result.current).toBe(false);
    resize(639);
    expect(result.current).toBe(true);
  });
  test("removes its listener on unmount", () => {
    resize(1000);
    const { result, unmount } = renderHook(() => useWindowWidth());
    expect(result.current).toBe(1000);
    unmount();
    resize(500); // would warn about updating an unmounted component if still subscribed
    expect(result.current).toBe(1000);
  });
});

const authWrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

describe("AuthContext", () => {
  test("login stores user + token, logout clears them", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
    expect(result.current.user).toBeNull();
    act(() => result.current.login({ id: "1", name: "Asha", role: "jobseeker" }, "tok"));
    expect(result.current.user.name).toBe("Asha");
    expect(localStorage.getItem("token")).toBe("tok");
    expect(JSON.parse(localStorage.getItem("user")).role).toBe("jobseeker");
    act(() => result.current.logout());
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("token")).toBeNull();
  });
  test("restores the user from localStorage and finishes loading", () => {
    localStorage.setItem("user", JSON.stringify({ id: "1", name: "Ravi", role: "recruiter" }));
    const { result } = renderHook(() => useAuth(), { wrapper: authWrapper });
    expect(result.current.user.name).toBe("Ravi");
    expect(result.current.loading).toBe(false);
  });
  test("a corrupted stored user does not crash the whole app [BUG-19]", () => {
    localStorage.setItem("user", "undefined");
    const Probe = () => <p>{useAuth().user ? "in" : "out"}</p>;
    render(<AuthProvider><Probe /></AuthProvider>);
    expect(screen.getByText("out")).toBeInTheDocument();
  });
});

describe("ThemeContext", () => {
  const wrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>;
  test("defaults to dark and toggles, persisting the choice and body class", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.isDark).toBe(true);
    expect(document.body).toHaveClass("dark-mode");
    act(() => result.current.toggleTheme());
    expect(result.current.isDark).toBe(false);
    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.body).not.toHaveClass("dark-mode");
  });
  test("honours a saved light theme", () => {
    localStorage.setItem("theme", "light");
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.isDark).toBe(false);
  });
});
