import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const REQUIRED_ENV = ["SEED_ADMIN_NAME", "SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD"] as const;

function getAdminInput() {
  const missing = REQUIRED_ENV.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno para el seed: ${missing.join(", ")}`);
  }
  return {
    name: process.env.SEED_ADMIN_NAME!.trim() as string,
    email: process.env.SEED_ADMIN_EMAIL!.trim().toLowerCase() as string,
    password: process.env.SEED_ADMIN_PASSWORD! as string,
  };
}

async function main() {
  const { name, email, password } = getAdminInput();
  if (password.length < 8) {
    throw new Error("SEED_ADMIN_PASSWORD debe tener al menos 8 caracteres");
  }

  const hashed = await bcrypt.hash(password, 12);
  const admin = await prisma.user.upsert({
    where: { email },
    update: { name, role: "ADMIN", isActive: true, password: hashed },
    create: { name, email, password: hashed, role: "ADMIN" },
    select: { id: true, name: true, email: true, role: true },
  });

  console.log(`Usuario administrador listo: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());