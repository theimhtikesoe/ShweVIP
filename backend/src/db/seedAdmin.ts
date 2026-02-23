import { Pool } from "pg";
import { env } from "../config/env";
import { PostgresRepository } from "../repositories/postgresRepository";
import { hashPassword } from "../utils/security";

async function seedAdmin(): Promise<void> {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const repository = new PostgresRepository(pool);

  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@pnm.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "AdminPass123";

  try {
    const existing = await repository.getUserByEmail(adminEmail);
    if (existing) {
      console.log(`Admin account already exists for ${adminEmail}`);
      return;
    }

    const admin = await repository.createUser({
      email: adminEmail,
      passwordHash: await hashPassword(adminPassword),
      role: "admin"
    });

    await repository.upsertSubscription(admin.id, {
      startDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      quota: 500_000_000_000
    });

    console.log(`Seeded admin account: ${adminEmail}`);
  } finally {
    await pool.end();
  }
}

seedAdmin().catch((error) => {
  console.error("Failed to seed admin", error);
  process.exit(1);
});
