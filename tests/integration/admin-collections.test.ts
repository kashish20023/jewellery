import { describe, it, expect, afterAll } from "vitest";
import { GET as listCollections, POST as createCollection } from "@/app/api/admin/collections/route";
import { PATCH as patchCollection, DELETE as deleteCollection } from "@/app/api/admin/collections/[id]/route";
import { createSessionToken } from "@/lib/admin/auth";
import { queryNavCollections } from "@/lib/navigation";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";
import { NextRequest } from "next/server";

/**
 * Collection management from the admin portal: RBAC, slug derivation, the
 * uniqueness guard, and the navbar visibility flag the storefront header
 * reads.
 *
 * tests/setup.ts points Prisma at a closed port, so the write path is gated
 * on TEST_DATABASE_URL and runs against a disposable Postgres:
 *   TEST_DATABASE_URL=<url> npx vitest run tests/integration/admin-collections
 */
describe("Admin collections API", () => {
  const managerToken = createSessionToken({
    id: "admin-manager-collections",
    email: "manager@chudiwalas.internal",
    name: "Salon Manager",
    role: Role.MANAGER,
  });
  const staffToken = createSessionToken({
    id: "admin-staff-collections",
    email: "staff@chudiwalas.internal",
    name: "Concierge",
    role: Role.STAFF,
  });

  const TITLE = `Vitest Suite ${Date.now()}`;
  const SLUG = TITLE.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  let createdId: string | null = null;

  const post = (token: string | null, body: unknown) =>
    createCollection(
      new NextRequest("http://localhost:3000/api/admin/collections", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      })
    );

  afterAll(async () => {
    if (createdId) await db.collection.deleteMany({ where: { id: createdId } });
  });

  const describeWithDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

  it("rejects unauthenticated reads with 401", async () => {
    const res = await listCollections(new NextRequest("http://localhost:3000/api/admin/collections"));
    expect(res.status).toBe(401);
  });

  it("forbids STAFF from creating a collection", async () => {
    const res = await post(staffToken, { title: "Staff Attempt" });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/MANAGER or OWNER/);
  });

  describeWithDb("against a live database", () => {
  it("lets a MANAGER create one and derives the slug from the title", async () => {
    const res = await post(managerToken, { title: TITLE, showInNav: true, displayOrder: 7 });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.collection.slug).toBe(SLUG);
    expect(data.collection.showInNav).toBe(true);
    expect(data.collection.productCount).toBe(0);
    createdId = data.collection.id;
  });

  it("refuses a second collection on the same URL with 409", async () => {
    const res = await post(managerToken, { title: TITLE });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain(SLUG);
  });

  it("publishes it to the storefront navbar", async () => {
    const nav = await queryNavCollections();
    expect(nav.map((c) => c.slug)).toContain(SLUG);
  });

  it("drops it from the navbar when showInNav is unticked, keeping its page live", async () => {
    const res = await patchCollection(
      new NextRequest(`http://localhost:3000/api/admin/collections/${createdId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${managerToken}` },
        body: JSON.stringify({ showInNav: false }),
      }),
      { params: Promise.resolve({ id: createdId! }) }
    );
    expect(res.status).toBe(200);
    expect((await res.json()).collection.showInNav).toBe(false);

    const nav = await queryNavCollections();
    expect(nav.map((c) => c.slug)).not.toContain(SLUG);
    expect(await db.collection.findUnique({ where: { slug: SLUG } })).not.toBeNull();
  });

  it("deletes it, which also clears the product tags", async () => {
    const res = await deleteCollection(
      new NextRequest(`http://localhost:3000/api/admin/collections/${createdId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${managerToken}` },
      }),
      { params: Promise.resolve({ id: createdId! }) }
    );
    expect(res.status).toBe(200);
    expect(await db.collection.findUnique({ where: { slug: SLUG } })).toBeNull();
    expect(await db.productCollection.count({ where: { collectionId: createdId! } })).toBe(0);
    createdId = null;
  });
  });
});
