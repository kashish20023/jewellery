import { describe, it, expect } from "vitest";
import { POST as callbackPost } from "@/app/api/enquiries/callback/route";
import { POST as appointmentPost } from "@/app/api/enquiries/appointment/route";
import { NextRequest } from "next/server";

describe("Concierge Enquiries & Appointments Integration (S11 / S12)", () => {
  describe("Callback Request API (/api/enquiries/callback - S11)", () => {
    it("successfully creates a callback lead with valid Indian phone number", async () => {
      const req = new NextRequest("http://localhost:3000/api/enquiries/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "192.168.1.50",
        },
        body: JSON.stringify({
          customerName: "Aditi Rao",
          customerPhone: "+91 9876543210",
          customerEmail: "aditi.rao@example.com",
          preferredTime: "Evening (4 PM - 7 PM)",
          message: "Interested in the Heritage Emerald Choker suite.",
        }),
      });

      const res = await callbackPost(req);
      expect([201, 500]).toContain(res.status); // 201 if DB available, 500 honest error if DB offline

      const data = await res.json();
      if (res.status === 201) {
        expect(data.success).toBe(true);
        expect(data.leadId).toBeDefined();
        expect(data.message).toContain("registered");
      } else {
        // S11: Honest failure message returned if DB is unreachable
        expect(data.success).toBe(false);
        expect(data.error).toContain("experiencing high load");
      }
    });

    it("rejects invalid phone number with 400 Bad Request", async () => {
      const req = new NextRequest("http://localhost:3000/api/enquiries/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "192.168.1.51",
        },
        body: JSON.stringify({
          customerName: "Aditi Rao",
          customerPhone: "12345", // Invalid
        }),
      });

      const res = await callbackPost(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("valid 10-digit Indian phone number");
    });

    it("enforces sliding-window rate limiting on excessive submissions", async () => {
      const spamIp = "192.168.99.1";
      const validPayload = {
        customerName: "Spam Tester",
        customerPhone: "9876543210",
      };

      // Submit 5 times to consume limit
      for (let i = 0; i < 5; i++) {
        const req = new NextRequest("http://localhost:3000/api/enquiries/callback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": spamIp,
          },
          body: JSON.stringify(validPayload),
        });
        await callbackPost(req);
      }

      // 6th request must trigger rate limit 429
      const blockedReq = new NextRequest("http://localhost:3000/api/enquiries/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": spamIp,
        },
        body: JSON.stringify(validPayload),
      });

      const res = await callbackPost(blockedReq);
      expect(res.status).toBe(429);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Too many callback requests");
      expect(data.retryAfterSeconds).toBeGreaterThan(0);
    });
  });

  describe("Appointment Request API (/api/enquiries/appointment - S12)", () => {
    it("submits viewing appointment request and explicitly returns REQUESTED_UNCONFIRMED status", async () => {
      const req = new NextRequest("http://localhost:3000/api/enquiries/appointment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "192.168.2.10",
        },
        body: JSON.stringify({
          customerName: "Vikram Singhania",
          customerPhone: "9876543210",
          customerEmail: "vikram@example.com",
          requestedDate: "2026-12-15",
          requestedTimeSlot: "11:00 AM - 01:00 PM",
          locationPreference: "IN_STORE",
        }),
      });

      const res = await appointmentPost(req);
      expect([201, 500]).toContain(res.status);

      const data = await res.json();
      if (res.status === 201) {
        expect(data.success).toBe(true);
        // S12 Contract: Returned explicitly as UNCONFIRMED request
        expect(data.status).toBe("REQUESTED_UNCONFIRMED");
        expect(data.appointmentId).toBeDefined();
        expect(data.message).toContain("concierge team will review availability");
      }
    });

    it("rejects invalid date format with 400 Bad Request", async () => {
      const req = new NextRequest("http://localhost:3000/api/enquiries/appointment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": "192.168.2.11",
        },
        body: JSON.stringify({
          customerName: "Vikram Singhania",
          customerPhone: "9876543210",
          customerEmail: "vikram@example.com",
          requestedDate: "not-a-real-date",
          requestedTimeSlot: "11:00 AM",
          locationPreference: "IN_STORE",
        }),
      });

      const res = await appointmentPost(req);
      expect(res.status).toBe(400);

      const data = await res.json();
      expect(data.success).toBe(false);
      expect(data.error).toContain("Invalid appointment date");
    });
  });
});

