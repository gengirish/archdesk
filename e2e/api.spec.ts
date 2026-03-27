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

  test("POST /api/projects/fake/milestones/fake/client-nudge rejects without auth", async ({
    request,
  }) => {
    const response = await request.post("/api/projects/fake/milestones/fake/client-nudge", {
      headers: { ...jsonHeaders, "Content-Type": "application/json" },
      data: { channel: "email" },
    });
    expect([401, 403, 404]).toContain(response.status());
  });

  test("POST /api/automation/decision-sla rejects without auth", async ({ request }) => {
    const response = await request.post("/api/automation/decision-sla", {
      headers: { ...jsonHeaders, "Content-Type": "application/json" },
      data: { send: false },
    });
    expect([401, 403, 404]).toContain(response.status());
  });

  test("GET /api/portal/fake-token/decisions returns not found", async ({ request }) => {
    const response = await request.get("/api/portal/fake-token/decisions", {
      headers: jsonHeaders,
    });
    expect(response.status()).toBe(404);
  });

  test("POST /api/portal/fake-token/decisions rejects with 404 or 429", async ({ request }) => {
    let gotExpected = false;
    for (let index = 0; index < 15; index += 1) {
      const response = await request.post("/api/portal/fake-token/decisions", {
        headers: { ...jsonHeaders, "Content-Type": "application/json" },
        data: {
          milestoneId: "fake-milestone",
          outcome: "APPROVED",
          comment: "Looks good",
        },
      });
      if ([404, 429].includes(response.status())) {
        gotExpected = true;
      }
    }
    expect(gotExpected).toBe(true);
  });
});
