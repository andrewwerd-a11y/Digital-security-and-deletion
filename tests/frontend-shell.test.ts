import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("frontend shell", () => {
  it("contains core navigation surfaces", () => {
    const app = readFileSync("apps/frontend/src/App.tsx", "utf8");
    expect(app).toContain("Overview");
    expect(app).toContain("Living Data Tree");
    expect(app).toContain("Detail Panel");
  });
});
