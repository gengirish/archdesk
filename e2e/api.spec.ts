import { test, expect } from "@playwright/test";

test.describe("API Routes (unauthenticated)", () => {
  const jsonHeaders = { Accept: "application/json" };

  test("GET /api/projects rejects without auth", async ({ request }) => {
    const response = await request.get("/api/projects", {
      headers: jsonHeaders,
    });
    expect([401, 403, 404]).toContain(response.status());
  });

  test("POST /api/projects rejects without auth", async ({ request }) => {
    const response = await request.post("/api/projects", {
      headers: { ...jsonHeaders, "Content-Type": "application/json" },
      data: { name: "Test Project", clientId: "fake", type: "RESIDENTIAL" },
    });
    expect([401, 403, 404]).toContain(response.status());
  });

  test("GET /api/projects/fake-id rejects without auth", async ({
    request,
  }) => {
    const response = await request.get("/api/projects/fake-id", {
      headers: jsonHeaders,
    });
    expect([401, 403, 404]).toContain(response.status());
  });

  test("PATCH /api/projects/fake-id rejects without auth", async ({
    request,
  }) => {
    const response = await request.patch("/api/projects/fake-id", {
      headers: { ...jsonHeaders, "Content-Type": "application/json" },
      data: { name: "Updated" },
    });
    expect([401, 403, 404]).toContain(response.status());
  });
});
