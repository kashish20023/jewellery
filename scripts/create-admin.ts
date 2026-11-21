/**
 * Creates (or updates) a real admin user for production.
 *
 * Usage:
 *   pnpm exec tsx scripts/create-admin.ts <email> <name> <OWNER|MANAGER|STAFF> [password]
 *
 * If no password is passed, a strong random one is generated and printed once.
 */
import { PrismaClient, Role } from "@prisma/client";
import crypto from "crypto";
import { hashPassword } from "../src/lib/admin/auth";

const prisma = new PrismaClient();

async function main() {
  const [email, name, roleArg, passwordArg] = process.argv.slice(2);
  if (!email || !name || !roleArg) {
    console.error("Usage: pnpm exec tsx scripts/create-admin.ts <email> <name> <OWNER|MANAGER|STAFF> [password]");
    process.exit(1);
  }
  const role = roleArg.toUpperCase() as Role;
  if (!["OWNER", "MANAGER", "STAFF"].includes(role)) {
    console.error(`Invalid role "${roleArg}". Use OWNER, MANAGER or STAFF.`);
    process.exit(1);
  }
  const password = passwordArg || crypto.randomBytes(12).toString("base64url");
  if (password.length < 10) {
    console.error("Password must be at least 10 characters.");
    process.exit(1);
  }

  const user = await prisma.adminUser.upsert({
    where: { email: email.trim().toLowerCase() },
    update: { name, role, passwordHash: hashPassword(password), isActive: true },
    create: {
      email: email.trim().toLowerCase(),
      name,
      role,
      passwordHash: hashPassword(password),
      isActive: true,
    },
  });

  console.log(`✓ Admin ${user.email} (${user.role}) ready.`);
  if (!passwordArg) {
    console.log(`  Generated password (shown once, store it safely): ${password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
