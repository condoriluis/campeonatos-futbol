import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const SLUG = "fixture-demo";

const TEAMS = [
  { name: "Lobos del Sur", color: "#2563eb" },
  { name: "Rayos X", color: "#f59e0b" },
  { name: "Masters FC", color: "#16a34a" },
  { name: "Titanes", color: "#7c3aed" },
  { name: "Leones RC", color: "#dc2626" },
  { name: "Furia Roja", color: "#ea580c" },
  { name: "Estrellas del Norte", color: "#0d9488" },
  { name: "Amigos de Siempre", color: "#db2777" },
];

const FIRST = ["Juan", "Carlos", "Luis", "Pedro", "Miguel", "Andrés", "Diego", "Jorge", "Marco", "Raúl", "Óscar", "Fabián"];
const LAST = ["Pérez", "Gómez", "Rojas", "Mamani", "Flores", "Choque", "Vargas", "Torres", "Ramos", "Soruco", "Cruz", "Mendoza"];

function roster(seed: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const n = (seed * 7 + i * 5) % FIRST.length;
    const l = (seed * 11 + i * 3 + n) % LAST.length;
    return {
      name: `${FIRST[n]} ${LAST[l]}`,
      number: i + 1,
      position: ["Arquero", "Ala", "Cierre", "Pívot", "Ala", "Ala"][i],
      ci: `8${(seed * 131 + i * 17).toString().padStart(6, "0")}`,
      captain: i === 0,
    };
  });
}

async function main() {
  await prisma.tournament.deleteMany({ where: { slug: SLUG } });

  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No hay usuario ADMIN para crear el torneo");

  const tournament = await prisma.tournament.create({
    data: {
      name: "Fixture Demo",
      slug: SLUG,
      sport: "FUTSAL",
      status: "INSCRIPCION",
      venue: "Complejo Municipal",
      city: "La Paz",
      ownerId: admin.id,
      description: "Torneo de prueba para generar fixture (fase de grupos en PENDIENTE).",
      rules: { create: {} },
    },
  });

  const category = await prisma.category.create({
    data: { tournamentId: tournament.id, name: "Libre", type: "MIXTO", order: 0 },
  });

  const phase = await prisma.phase.create({
    data: {
      categoryId: category.id,
      name: "Fase de Grupos",
      type: "GRUPOS",
      position: 0,
      status: "PENDIENTE",
      config: { groupCount: 2, rounds: 1, classifyPerGroup: 2, bestThirds: 0 },
      qualifiers: [],
    },
  });

  const groupA = await prisma.group.create({ data: { phaseId: phase.id, name: "A", position: 0 } });
  const groupB = await prisma.group.create({ data: { phaseId: phase.id, name: "B", position: 1 } });

  const createdTeams: { id: string; name: string }[] = [];
  for (let i = 0; i < TEAMS.length; i++) {
    const t = await prisma.team.create({
      data: { categoryId: category.id, name: TEAMS[i].name, color: TEAMS[i].color, order: i, status: "ACTIVO" },
    });
    await prisma.player.createMany({
      data: roster(i).map((p) => ({ teamId: t.id, name: p.name, jerseyNumber: p.number, position: p.position, document: p.ci, isCaptain: p.captain, status: "HABILITADO" })),
    });
    createdTeams.push({ id: t.id, name: t.name });
  }

  // Distribución balanceada A/B (4 y 4, alternando fuerza)
  const half = Math.ceil(createdTeams.length / 2);
  const A = createdTeams.slice(0, half);
  const B = createdTeams.slice(half);
  await prisma.groupTeam.createMany({
    data: [
      ...A.map((t, i) => ({ groupId: groupA.id, teamId: t.id, seed: i })),
      ...B.map((t, i) => ({ groupId: groupB.id, teamId: t.id, seed: i })),
    ],
  });

  console.log("Creado torneo 'Fixture Demo'");
  console.log("  Grupo A:", A.map((t) => t.name).join(", "));
  console.log("  Grupo B:", B.map((t) => t.name).join(", "));
  console.log("  Fase 'Fase de Grupos' en PENDIENTE — lista para 'Generar fixture'.");
  console.log("Panel → Campeonatos → Fixture Demo → Fases");
  await prisma.$disconnect();
}
main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});