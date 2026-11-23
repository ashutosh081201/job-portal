import { describe, test, expect } from "vitest";
import { visibleResumes } from "../utils/resumes";

const list = Array.from({ length: 8 }, (_, i) => ({ _id: "r" + i }));
const ids = (rs) => rs.map((r) => r._id);

describe("visibleResumes", () => {
  test("short lists are shown whole", () => {
    expect(ids(visibleResumes(list.slice(0, 3), "r0", false))).toEqual(["r0", "r1", "r2"]);
  });
  test("long lists show the newest 3 until expanded", () => {
    expect(ids(visibleResumes(list, "r1", false))).toEqual(["r0", "r1", "r2"]);
    expect(visibleResumes(list, "r1", true)).toHaveLength(8);
  });
  test("an older selected resume stays visible when collapsed", () => {
    expect(ids(visibleResumes(list, "r6", false))).toEqual(["r0", "r1", "r2", "r6"]);
  });
});
