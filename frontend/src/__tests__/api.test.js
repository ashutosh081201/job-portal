import { describe, test, expect, vi } from "vitest";
import api from "../services/api";

describe("api client", () => {
  test("base URL comes from VITE_API_URL (the test stub, never frontend/.env)", () => {
    expect(import.meta.env.VITE_API_URL).toBe("http://api.test");
    expect(api.defaults.baseURL).toBe("http://api.test/api");
  });
  test("attaches the stored token as a Bearer header", async () => {
    localStorage.setItem("token", "abc");
    const config = await api.interceptors.request.handlers[0].fulfilled({ headers: {} });
    expect(config.headers.Authorization).toBe("Bearer abc");
  });
  test("no token -> no Authorization header", async () => {
    const config = await api.interceptors.request.handlers[0].fulfilled({ headers: {} });
    expect(config.headers.Authorization).toBeUndefined();
  });
});

import { errorMessage } from "../services/api";

describe("errorMessage", () => {
  test("prefers the server's message, then network wording, then the fallback", () => {
    expect(errorMessage({ response: { data: { message: "Job not found" } } }, "x")).toBe("Job not found");
    expect(errorMessage({ request: {} }, "x")).toMatch(/Can't reach the server/);
    expect(errorMessage({ response: { data: {} } }, "Failed")).toBe("Failed");
  });
});

describe("expired session handling", () => {
  test("a 401 on an authenticated request clears the stored session", async () => {
    localStorage.setItem("token", "old");
    localStorage.setItem("user", "{}");
    const onRejected = api.interceptors.response.handlers[0].rejected;
    const assign = vi.fn();
    vi.stubGlobal("location", { pathname: "/jobs", assign });
    await expect(
      onRejected({ config: { headers: { Authorization: "Bearer old" } }, response: { status: 401 } }),
    ).rejects.toBeTruthy();
    expect(localStorage.getItem("token")).toBeNull();
    expect(assign).toHaveBeenCalledWith("/login?expired=1");
    vi.unstubAllGlobals();
  });
  test("a 401 on a login attempt (no token) leaves storage alone", async () => {
    localStorage.setItem("theme", "dark");
    const onRejected = api.interceptors.response.handlers[0].rejected;
    await expect(onRejected({ config: { headers: {} }, response: { status: 401 } })).rejects.toBeTruthy();
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});
