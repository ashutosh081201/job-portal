const request = require("supertest");
const { parseAllowedOrigins, isAllowedOrigin } = require("../utils/cors");

const PROD = "https://job-portal-rho-ruby.vercel.app";
const PATTERN = "https://job-portal-*-apps-6474.vercel.app";

describe("CLIENT_URL origin matching", () => {
  const allowed = parseAllowedOrigins(`${PROD}, ${PATTERN}/ ,http://localhost:5173`);

  test.each([
    [PROD, true],
    ["http://localhost:5173", true],
    ["https://job-portal-bnsw6ehp6-apps-6474.vercel.app", true],
    ["https://job-portal-git-main-apps-6474.vercel.app", true],
    ["https://JOB-PORTAL-ABC123-APPS-6474.VERCEL.APP", true],
  ])("allows %s", (origin, ok) => expect(isAllowedOrigin(origin, allowed)).toBe(ok));

  test.each([
    ["another team's deployment", "https://job-portal-abc-apps-9999.vercel.app"],
    ["a different project", "https://other-app-abc-apps-6474.vercel.app"],
    ["a dot smuggled into the wildcard", "https://job-portal-x.evil.com-apps-6474.vercel.app"],
    ["a suffix after the pattern", "https://job-portal-abc-apps-6474.vercel.app.evil.com"],
    ["http instead of https", "http://job-portal-abc-apps-6474.vercel.app"],
    ["an empty wildcard", "https://job-portal--apps-6474.vercel.app"],
    ["a lookalike of the exact origin", "https://job-portal-rho-ruby.vercel.app.evil.com"],
  ])("blocks %s", (_name, origin) => expect(isAllowedOrigin(origin, allowed)).toBe(false));

  test("regex characters in an exact origin are not treated as patterns", () => {
    const exact = parseAllowedOrigins("https://a.b.com");
    expect(isAllowedOrigin("https://aXb.com", exact)).toBe(false);
  });
});

describe("CORS through the real app", () => {
  const loadApp = (clientUrl) => {
    let app;
    const before = process.env.CLIENT_URL;
    process.env.CLIENT_URL = clientUrl;
    jest.isolateModules(() => {
      app = require("../app");
    });
    process.env.CLIENT_URL = before;
    return app;
  };

  const preflight = (app, origin) =>
    request(app)
      .options("/api/jobs")
      .set("Origin", origin)
      .set("Access-Control-Request-Method", "GET");

  test("allows the production URL and this project's deployment URLs, blocks others", async () => {
    const app = loadApp(`${PROD},${PATTERN}`);
    const deploy = "https://job-portal-bnsw6ehp6-apps-6474.vercel.app";

    expect((await preflight(app, PROD)).headers["access-control-allow-origin"]).toBe(PROD);
    expect((await preflight(app, deploy)).headers["access-control-allow-origin"]).toBe(deploy);
    expect((await preflight(app, "https://evil.example")).headers["access-control-allow-origin"]).toBeUndefined();

    const res = await request(app).get("/").set("Origin", deploy).expect(200);
    expect(res.headers["access-control-allow-origin"]).toBe(deploy);
  });

  test("requests without an Origin header (curl, health checks) still work", async () => {
    const app = loadApp(PROD);
    await request(app).get("/").expect(200);
  });

  test("with CLIENT_URL unset any origin is allowed", async () => {
    const app = loadApp("");
    expect((await preflight(app, "https://anything.example")).headers["access-control-allow-origin"]).toBe("*");
  });
});
