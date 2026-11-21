import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import JakesTemplate from "../components/resume/JakesTemplate";

const data = {
  personalInfo: {
    name: "Asha",
    email: "  asha@example.com ",
    phone: "999",
    linkedin: "https://www.linkedin.com/in/asha-k/",
    github: "github.com/asha",
  },
};

describe("resume contact links", () => {
  test("email is a mailto link that opens in place, not in a new tab", () => {
    render(<JakesTemplate data={data} />);
    const email = screen.getByRole("link", { name: "asha@example.com" });
    expect(email).toHaveAttribute("href", "mailto:asha@example.com");
    expect(email).not.toHaveAttribute("target");
  });

  test("LinkedIn and GitHub open in a new tab with the username as text", () => {
    render(<JakesTemplate data={data} />);
    const linkedin = screen.getByRole("link", { name: "asha-k" });
    expect(linkedin).toHaveAttribute("href", "https://www.linkedin.com/in/asha-k");
    expect(linkedin).toHaveAttribute("target", "_blank");
    expect(linkedin).toHaveAttribute("rel", "noopener noreferrer");
    expect(screen.getByRole("link", { name: "asha" })).toHaveAttribute("href", "https://github.com/asha");
  });

  test("a blank email is left out instead of producing an empty mailto link", () => {
    render(<JakesTemplate data={{ personalInfo: { name: "A", email: "   " } }} />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});
