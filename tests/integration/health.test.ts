import { describe, it, expect } from "vitest";
import { GET } from "@/app/api/health/route";

describe("Health API Route (/api/health)", () => {
  it("returns 200 or 503 with standard health response structure", async () => {
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBeOneOf([200, 503]);
    expect(data).toHaveProperty("status");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("database");

    if (response.status === 200) {
      expect(data.status).toBe("ok");
      expect(data.database).toBe("connected");
      expect(data.store).toMatchObject({
        name: expect.any(String),
        currency: "INR",
        highValueThresholdPaise: expect.any(String),
      });
    } else {
      expect(data.status).toBe("degraded");
      expect(data.database).toBe("disconnected");
    }
  });
});

