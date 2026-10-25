// Deadlines are calendar dates; a job is open until the end of that date in
// India time (same rule as the server). Times below are IST wall-clock times,
// and every expectation must hold whatever the browser's own time zone is
// (`npm run test:tz` repeats the suite in New York).
import { describe, test, expect, vi } from "vitest";
import { inferSalaryRange, isDeadlinePast, getDeadlineInfo, formatDeadline } from "../utils/jobs";

const TZ = process.env.TZ;
const IST_OFFSET_MS = 5.5 * 3600 * 1000;
const atIST = (y, m, d, hh = 12, mm = 0) => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MS));
};
const deadline = (s) => new Date(s).toISOString(); // what the API returns

describe("inferSalaryRange", () => {
  test.each([
    [undefined, "Not Disclosed"],
    ["Not Disclosed", "Not Disclosed"],
    ["competitive", "Not Disclosed"],
    ["0 LPA", "Not Disclosed"],
    ["2.99 LPA", "0-3 LPA"],
    ["3", "3-6 LPA"],
    ["₹5.5 - 7 LPA", "3-6 LPA"],
    ["9.9", "6-10 LPA"],
    ["10", "10-15 LPA"],
    ["24.99", "15-25 LPA"],
    ["25", "25+ LPA"],
    ["1,20,000", "0-3 LPA"],
  ])("%s -> %s", (input, out) => expect(inferSalaryRange(input)).toBe(out));
});

describe(`isDeadlinePast (browser TZ=${TZ})`, () => {
  test("empty or unparseable deadline is never past", () => {
    expect(isDeadlinePast("")).toBe(false);
    expect(isDeadlinePast("not-a-date")).toBe(false);
  });
  test("yesterday is past, tomorrow is not", () => {
    atIST(2026, 10, 25);
    expect(isDeadlinePast("2026-10-24")).toBe(true);
    expect(isDeadlinePast("2026-10-26")).toBe(false);
  });
  test.each([
    ["just after midnight IST", 0, 1],
    ["late evening IST", 23, 59],
  ])("today's date can be chosen (%s) [BUG-18]", (_n, hh, mm) => {
    atIST(2026, 10, 25, hh, mm);
    expect(isDeadlinePast("2026-10-25")).toBe(false);
  });
  test("year boundary: on 1 Jan IST, 31 Dec is past and 1 Jan is not [BUG-18]", () => {
    atIST(2027, 1, 1, 0, 30);
    expect(isDeadlinePast("2026-12-31")).toBe(true);
    expect(isDeadlinePast("2027-01-01")).toBe(false);
  });
});

describe(`getDeadlineInfo (browser TZ=${TZ})`, () => {
  test("closed status wins, with variant wording", () => {
    expect(getDeadlineInfo("2099-01-01", "closed")).toMatchObject({ text: "Closed", isClosed: true });
    expect(getDeadlineInfo(null, "closed", "detail")).toMatchObject({ text: "This job is closed" });
  });
  test("no deadline -> null", () => {
    expect(getDeadlineInfo(null, "active")).toBeNull();
  });
  test("far deadline shows the calendar date itself (month may be 'Sep' or 'Sept' by ICU) [BUG-18]", () => {
    atIST(2026, 8, 1);
    expect(getDeadlineInfo(deadline("2026-09-15"), "active").text).toMatch(/^Closes 15 Sept?$/);
    expect(getDeadlineInfo(deadline("2026-09-15"), "active", "detail").text).toMatch(/^Closes 15 Sept? 2026$/);
    expect(formatDeadline(deadline("2026-09-15"))).toMatch(/^15 Sept? 2026$/);
  });
  test.each([
    ["just after midnight on the deadline day", [2026, 10, 25, 0, 1], "Closes today", false],
    ["last minute of the deadline day", [2026, 10, 25, 23, 59], "Closes today", false],
    ["late evening the day before", [2026, 10, 24, 23, 0], "Closes in 1 day", false],
    ["just after midnight the day after", [2026, 10, 26, 0, 1], "Expired", true],
    ["three days before", [2026, 10, 22, 9, 0], "Closes in 3 days", false],
  ])("%s [BUG-18]", (_n, when, text, isClosed) => {
    atIST(...when);
    expect(getDeadlineInfo(deadline("2026-10-25"), "active")).toMatchObject({ text, isClosed });
  });
  test.each([
    ["month end", [2026, 11, 1, 0, 1], "2026-10-31"],
    ["quarter end", [2027, 4, 1, 0, 1], "2027-03-31"],
    ["year end", [2027, 1, 1, 0, 1], "2026-12-31"],
    ["leap day", [2028, 3, 1, 0, 1], "2028-02-29"],
  ])("%s: one minute into the next day (IST) it is expired", (_n, when, d) => {
    atIST(...when);
    expect(getDeadlineInfo(deadline(d), "active", "detail")).toMatchObject({ text: "Deadline passed", isClosed: true });
  });
});
