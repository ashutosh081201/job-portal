import { describe, test, expect } from "vitest";
import { normalizeUrl, extractLinkedInUsername, extractGithubUsername } from "../utils/links";

describe("normalizeUrl", () => {
  test.each([
    ["", ""],
    [undefined, ""],
    ["github.com/x", "https://github.com/x"],
    ["http://a.com", "http://a.com"],
    ["https://a.com", "https://a.com"],
  ])("%s -> %s", (input, out) => expect(normalizeUrl(input)).toBe(out));
});

describe("extractLinkedInUsername", () => {
  test.each([
    ["https://www.linkedin.com/in/asha-k/", "asha-k"],
    ["linkedin.com/in/asha-k", "asha-k"],
    ["www.linkedin.com/asha-k", "asha-k"],
    ["  asha-k  ", "asha-k"],
    ["", ""],
  ])("%s -> %s", (input, out) => expect(extractLinkedInUsername(input)).toBe(out));
});

describe("extractGithubUsername", () => {
  test.each([
    ["https://github.com/asha/", "asha"],
    ["github.com/asha", "asha"],
    ["asha", "asha"],
    [null, ""],
  ])("%s -> %s", (input, out) => expect(extractGithubUsername(input)).toBe(out));
});
