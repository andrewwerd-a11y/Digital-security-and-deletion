import { describe, expect, it } from "vitest";
import { buildServer } from "../apps/backend/src/api/server.js";

describe("startup routes", () => {
  it("returns health", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
    await app.close();
  });

  it("returns status with repository registry", async () => {
    const app = await buildServer();
    const response = await app.inject({ method: "GET", url: "/status" });
    const json = response.json();

    expect(response.statusCode).toBe(200);
    expect(json.datastore).toBe("postgresql");
    expect(json.repositories).toContain("policyDecisionRepository");
    expect(json.repositories).toContain("approvalRepository");
    expect(json.repositories).toContain("discoveryRunRepository");
    await app.close();
  });
});
