import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import argon2 from "argon2";

import { PrismaClient, RoleScope } from "../src/generated/prisma/client";
import { ROLE_CODES, SCHOOL_PERMISSIONS } from "../src/modules/auth/constants";
import { ensureDefaultTenantRoles } from "../src/modules/auth/rbac-service";
import { normalizeIdentity } from "../src/lib/utils";
import { makePlatformIdentityKey } from "../src/lib/identity";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required for seeding.");

if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
  throw new Error(
    "Production seeding is disabled. Bootstrap deliberately with ALLOW_PRODUCTION_SEED=true.",
  );
}

const email = process.env.SUPER_ADMIN_EMAIL;
const username = process.env.SUPER_ADMIN_USERNAME ?? "superadmin";
const initialPassword = process.env.SUPER_ADMIN_INITIAL_PASSWORD;

if (!email || !initialPassword) {
  throw new Error(
    "SUPER_ADMIN_EMAIL and SUPER_ADMIN_INITIAL_PASSWORD are required. Use non-production development credentials locally.",
  );
}

if (initialPassword.length < 12) {
  throw new Error("SUPER_ADMIN_INITIAL_PASSWORD must contain at least 12 characters.");
}

const requiredEmail: string = email;
const requiredInitialPassword: string = initialPassword;

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await argon2.hash(requiredInitialPassword, {
    type: argon2.argon2id,
    memoryCost: 65_536,
    timeCost: 3,
    parallelism: 1,
  });

  const role = await prisma.role.upsert({
    where: { identityKey: `global:${ROLE_CODES.SUPER_ADMIN}` },
    update: { name: "Super Administrator", scope: RoleScope.GLOBAL },
    create: {
      identityKey: `global:${ROLE_CODES.SUPER_ADMIN}`,
      code: ROLE_CODES.SUPER_ADMIN,
      name: "Super Administrator",
      description: "Global platform owner. Never belongs to a school tenant.",
      scope: RoleScope.GLOBAL,
      isSystem: true,
    },
  });

  const permissionIds: string[] = [];
  for (const [code, name] of SCHOOL_PERMISSIONS) {
    const permission = await prisma.permission.upsert({
      where: { identityKey: `global:${code}` },
      update: { name },
      create: { identityKey: `global:${code}`, code, name },
    });
    permissionIds.push(permission.id);
  }

  await prisma.rolePermission.createMany({
    data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
    skipDuplicates: true,
  });

  const schoolAdminRoles = await prisma.role.findMany({
    where: { code: ROLE_CODES.SCHOOL_ADMIN, scope: RoleScope.SCHOOL },
    select: { id: true, schoolId: true },
  });
  for (const schoolRole of schoolAdminRoles) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        schoolId: schoolRole.schoolId,
        roleId: schoolRole.id,
        permissionId,
      })),
      skipDuplicates: true,
    });
  }

  const schools = await prisma.school.findMany({ select: { id: true } });
  for (const school of schools) {
    await prisma.$transaction((transaction) => ensureDefaultTenantRoles(transaction, school.id));
  }

  const normalizedUsername = normalizeIdentity(username);
  const normalizedEmail = normalizeIdentity(requiredEmail);
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { identityKey: makePlatformIdentityKey(normalizedUsername) },
  });
  const superAdmin = existingSuperAdmin
    ? existingSuperAdmin
    : await prisma.user.create({
        data: {
      identityKey: makePlatformIdentityKey(normalizedUsername),
      username,
      normalizedUsername,
      email: requiredEmail,
      normalizedEmail,
      passwordHash,
      firstName: "Platform",
      lastName: "Administrator",
      status: "ACTIVE",
      mustChangePassword: true,
        },
      });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: superAdmin.id, roleId: role.id } },
    update: {},
    create: { userId: superAdmin.id, roleId: role.id },
  });

  process.stdout.write(
    existingSuperAdmin
      ? `Synchronized permissions for ${username} (${requiredEmail}) without changing its password.\n`
      : `Seeded Super Admin ${username} (${requiredEmail}). A password change is required at first login.\n`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
