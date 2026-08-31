import "dotenv/config";
import { PrismaClient, type Prisma, type CategoryType } from "@prisma/client";
import { generateRoundRobin } from "../lib/engine/round-robin";
import { scheduleMatches, scheduleKnockout } from "../lib/engine/scheduler";
import { generateBracket } from "../lib/engine/bracket";

const prisma = new PrismaClient();

const SLUG = process.env.SEED_DEMO_SLUG?.trim() || "relampago-villa-remedios";

type RosterPlayer = { name: string; number: number; position: string; ci: string; captain?: boolean };
type TeamSeed = { name: string; color?: string; roster: RosterPlayer[] };

const VARONES_TEAMS: (TeamSeed & { group: "A" | "B"; strength: number })[] = [
  {
    name: "Academia Cruceña",
    color: "#ef4444",
    group: "A",
    strength: 0,
    roster: [
      { name: "Rodrigo Álvarez", number: 1, position: "Arquero", ci: "7123451", captain: true },
      { name: "Marco Antelo", number: 2, position: "Cierre", ci: "7123452" },
      { name: "Sergio Ibáñez", number: 4, position: "Ala", ci: "7123453" },
      { name: "Juan Carlos Salvatierra", number: 7, position: "Ala", ci: "7123454" },
      { name: "Abel Justiniano", number: 9, position: "Delantero", ci: "7123455" },
      { name: "Cristhian Roca", number: 10, position: "Delantero", ci: "7123456" },
    ],
  },
  {
    name: "Barcelona FC",
    group: "A",
    strength: 1,
    roster: [],
  },
  {
    name: "San Martín F.C.",
    color: "#3b82f6",
    group: "A",
    strength: 2,
    roster: [
      { name: "Álvaro Rojas", number: 1, position: "Arquero", ci: "7123461", captain: true },
      { name: "Pablo Vaca", number: 3, position: "Cierre", ci: "7123462" },
      { name: "Daniel Suárez", number: 6, position: "Ala", ci: "7123463" },
      { name: "Hugo Peña", number: 8, position: "Ala", ci: "7123464" },
      { name: "Facundo Lora", number: 11, position: "Delantero", ci: "7123465" },
      { name: "Boris Cuéllar", number: 14, position: "Delantero", ci: "7123466" },
    ],
  },
  {
    name: "Atlético Central",
    color: "#8b5cf6",
    group: "A",
    strength: 3,
    roster: [
      { name: "Jhonny Hurtado", number: 1, position: "Arquero", ci: "7123471", captain: true },
      { name: "Geovanni Limpias", number: 2, position: "Cierre", ci: "7123472" },
      { name: "Wilmer Flores", number: 5, position: "Ala", ci: "7123473" },
      { name: "Samuel Paredes", number: 7, position: "Ala", ci: "7123474" },
      { name: "Óscar Cabrera", number: 9, position: "Delantero", ci: "7123475" },
      { name: "Álex Da Silva", number: 12, position: "Delantero", ci: "7123476" },
    ],
  },
  {
    name: "Toros del Norte",
    color: "#eab308",
    group: "B",
    strength: 0,
    roster: [
      { name: "Miguel Ayala", number: 1, position: "Arquero", ci: "7123481", captain: true },
      { name: "René Cardozo", number: 2, position: "Cierre", ci: "7123482" },
      { name: "Andrés Mercado", number: 4, position: "Ala", ci: "7123483" },
      { name: "Cristian Flores", number: 6, position: "Ala", ci: "7123484" },
      { name: "Milton Vaca", number: 9, position: "Delantero", ci: "7123485" },
      { name: "Jorge Salazar", number: 10, position: "Delantero", ci: "7123486" },
    ],
  },
  {
    name: "Los Halcones FC",
    group: "B",
    strength: 1,
    roster: [],
  },
  {
    name: "Deportivo Oriental",
    color: "#10b981",
    group: "B",
    strength: 2,
    roster: [
      { name: "Pedro Zambrana", number: 1, position: "Arquero", ci: "7123491", captain: true },
      { name: "Iván Arancibia", number: 3, position: "Cierre", ci: "7123492" },
      { name: "David Ríos", number: 5, position: "Ala", ci: "7123493" },
      { name: "Saúl Gutiérrez", number: 8, position: "Ala", ci: "7123494" },
      { name: "Héctor Villea", number: 11, position: "Delantero", ci: "7123495" },
      { name: "Jimmy Ortiz", number: 13, position: "Delantero", ci: "7123496" },
    ],
  },
  {
    name: "Real Villa Primero",
    color: "#f97316",
    group: "B",
    strength: 3,
    roster: [
      { name: "Alberto Lijeron", number: 1, position: "Arquero", ci: "7123501", captain: true },
      { name: "Óscar Torrez", number: 2, position: "Cierre", ci: "7123502" },
      { name: "Christian Orellana", number: 4, position: "Ala", ci: "7123503" },
      { name: "Ramiro Fernández", number: 7, position: "Ala", ci: "7123504" },
      { name: "Hernán Arce", number: 9, position: "Delantero", ci: "7123505" },
      { name: "Sebastián Cabello", number: 10, position: "Ala", ci: "7123506" },
    ],
  },
];

const DAMAS_TEAMS: TeamSeed[] = [
  {
    name: "Las Panteras",
    color: "#ec4899",
    roster: [
      { name: "Camila Nogales", number: 1, position: "Arquera", ci: "7234001", captain: true },
      { name: "Valeria Roca", number: 3, position: "Cierre", ci: "7234002" },
      { name: "Daniela Montero", number: 6, position: "Ala", ci: "7234003" },
      { name: "Fernanda Claure", number: 8, position: "Ala", ci: "7234004" },
      { name: "Gabriela Soruco", number: 10, position: "Delantera", ci: "7234005" },
    ],
  },
  {
    name: "Furia Verde",
    color: "#22c55e",
    roster: [
      { name: "Paola Ribero", number: 1, position: "Arquera", ci: "7234011", captain: true },
      { name: "Laura Aguilar", number: 4, position: "Cierre", ci: "7234012" },
      { name: "Marcia Vega", number: 7, position: "Ala", ci: "7234013" },
      { name: "Sofía Ramierez", number: 9, position: "Ala", ci: "7234014" },
      { name: "Carolina Zabala", number: 11, position: "Delantera", ci: "7234015" },
    ],
  },
];

async function main() {
  const tournament = await prisma.tournament.findUnique({ where: { slug: SLUG } });
  if (!tournament) throw new Error(`Torneo no encontrado (slug: ${SLUG})`);

  await prisma.tournament.update({
    where: { id: tournament.id },
    data: { sport: "FUTSAL", status: "EN_PROGRESO" },
  });

  const varonesCat = await ensureCategory(tournament.id, "Varones", "VARONES", 0);
  const damasCat = await ensureCategory(tournament.id, "Damas", "DAMAS", 1);

  const varonesTeams = await ensureTeams(varonesCat.id, VARONES_TEAMS);
  const damasTeams = await ensureTeams(damasCat.id, DAMAS_TEAMS);

  for (const [catId, seeds] of [
    [varonesCat.id, VARONES_TEAMS],
    [damasCat.id, DAMAS_TEAMS],
  ] as [string, TeamSeed[]][]) {
    for (const seed of seeds) {
      const team = varonesCat.id === catId ? varonesTeams[seed.name] : damasTeams[seed.name];
      if (team && seed.roster.length > 0) await ensureRoster(team.id, seed.roster);
    }
  }

  await setupVarones(varonesCat.id, varonesTeams);
  await setupDamas(damasCat.id, damasTeams);

  console.log("Demo cargado. Torneo:", tournament.name);
}

async function ensureCategory(tournamentId: string, name: string, type: CategoryType, order: number) {
  const existing = await prisma.category.findFirst({
    where: { tournamentId, type },
  });
  if (existing) {
    if (existing.name !== name) await prisma.category.update({ where: { id: existing.id }, data: { name } });
    return existing;
  }
  const oldLibre = await prisma.category.findFirst({ where: { tournamentId, name: "Libre" } });
  if (oldLibre) {
    await prisma.phase.deleteMany({ where: { categoryId: oldLibre.id } });
    const updated = await prisma.category.update({
      where: { id: oldLibre.id },
      data: { name, type, order },
    });
    return updated;
  }
  return prisma.category.create({ data: { tournamentId, name, type, order } });
}

async function ensureTeams(categoryId: string, seeds: TeamSeed[]) {
  const map: Record<string, { id: string; name: string }> = {};
  for (let idx = 0; idx < seeds.length; idx++) {
    const seed = seeds[idx];
    const existing = await prisma.team.findFirst({ where: { categoryId, name: seed.name } });
    if (existing) {
      map[seed.name] = existing;
      continue;
    }
    const team = await prisma.team.create({
      data: { categoryId, name: seed.name, color: seed.color ?? null, order: idx },
    });
    map[seed.name] = team;
  }
  return map;
}

async function ensureRoster(teamId: string, roster: RosterPlayer[]) {
  const count = await prisma.player.count({ where: { teamId } });
  if (count > 0) return;
  await prisma.player.createMany({
    data: roster.map((r) => ({
      teamId,
      name: r.name,
      jerseyNumber: r.number,
      position: r.position,
      document: r.ci,
      isCaptain: !!r.captain,
      status: "HABILITADO",
    })),
  });
}

function scoreFor(strengthHome: number, strengthAway: number): [number, number] {
  const diff = Math.abs(strengthHome - strengthAway);
  const winnerGoals = 3 + Math.min(diff, 3);
  const loserGoals = diff === 0 ? 2 : 1 + (diff % 2);
  return strengthHome < strengthAway ? [winnerGoals, loserGoals] : [loserGoals, winnerGoals];
}

type TeamInfo = { id: string; name: string; strength: number };

async function setupVarones(categoryId: string, teams: Record<string, { id: string; name: string }>) {
  const groupPhase = await prisma.phase.findFirst({
    where: { categoryId, type: "GRUPOS" },
    include: { matches: true },
  });

  let phaseId: string;
  if (groupPhase && groupPhase.matches.length > 0) {
    console.log("Varones: la fase de grupos ya tiene partidos; se omite regenerar.");
    phaseId = groupPhase.id;
  } else {
    const groupsByName: Record<string, TeamInfo[]> = { A: [], B: [] };
    for (const seed of VARONES_TEAMS) {
      const team = teams[seed.name];
      groupsByName[seed.group ?? "A"].push({ id: team.id, name: team.name, strength: seed.strength });
    }
    const groupSort = (a: TeamInfo, b: TeamInfo) => a.strength - b.strength;
    groupsByName.A.sort(groupSort);
    groupsByName.B.sort(groupSort);

    const phase =
      groupPhase ??
      (await prisma.phase.create({
        data: {
          categoryId,
          name: "Fase de Grupos",
          type: "GRUPOS",
          position: 0,
          status: "EN_PROGRESO",
          config: { groupCount: 2, rounds: 1, classifyPerGroup: 2, bestThirds: 0 },
          qualifiers: {},
        },
      }));

    let order = 0;
    const tournamentId = (await prisma.tournament.findFirst({ where: { categories: { some: { id: categoryId } } }, select: { id: true } }))!.id;
    for (const [name, list] of Object.entries(groupsByName)) {
      const group = await prisma.group.upsert({
        where: { id: `${phase.id}-${name}` },
        create: { phaseId: phase.id, name, position: name === "A" ? 0 : 1 },
        update: {},
      });
      await prisma.groupTeam.deleteMany({ where: { groupId: group.id } });
      await prisma.groupTeam.createMany({
        data: list.map((t, i) => ({ groupId: group.id, teamId: t.id, seed: i })),
      });

      const rr = generateRoundRobin(list.map((t) => t.id));
      const scheduled = scheduleMatches(rr, {
        venues: ["Cancha Central", "Cancha Secundaria"],
        startDate: new Date(),
        startTime: "09:00",
        gapMinutes: 75,
      });

      const byTeamId = new Map(list.map((t) => [t.id, t]));
      for (const s of scheduled) {
        const homeTeam = byTeamId.get(s.home)!;
        const awayTeam = byTeamId.get(s.away)!;
        const [homeScore, awayScore] = scoreFor(homeTeam.strength, awayTeam.strength);
        const match = await prisma.match.create({
          data: {
            tournamentId,
            categoryId,
            phaseId: phase.id,
            groupId: group.id,
            jornada: s.jornada,
            order: order++,
            homeTeamId: s.home,
            awayTeamId: s.away,
            scheduledAt: s.scheduledAt,
            venue: s.venue,
            status: "FINALIZADO",
            homeScore,
            awayScore,
            winnerId: homeScore > awayScore ? s.home : s.away,
            startedAt: s.scheduledAt,
            endedAt: s.scheduledAt ? new Date(s.scheduledAt.getTime() + 30 * 60 * 1000) : null,
          },
        });
        await addEvents(match.id, homeScore > awayScore ? s.home : s.away, homeScore, awayScore);
      }
    }

    await prisma.phase.update({ where: { id: phase.id }, data: { status: "FINALIZADO" } });
    phaseId = phase.id;
  }

  const bracket = await prisma.phase.findFirst({ where: { categoryId, type: "LLAVES" } });
  const existingKnockoutMatches = await prisma.match.count({ where: { phaseId: bracket?.id ?? "" } });
  if (bracket && existingKnockoutMatches > 0) {
    console.log("Varones: las llaves ya tienen partidos; se omite regenerar.");
    return;
  }

  const qualifiers = await computeGroupQualifiers(phaseId);
  const [, tournament] = await Promise.all([
    prisma.category.findUniqueOrThrow({ where: { id: categoryId } }),
    prisma.tournament.findFirst({ where: { categories: { some: { id: categoryId } } } }),
  ]);

  const knockout =
    bracket ??
    (await prisma.phase.create({
      data: {
        categoryId,
        name: "Llaves Finales",
        type: "LLAVES",
        position: 1,
        status: "PENDIENTE",
        fromPhaseId: phaseId,
        config: { leg: "SIMPLE", includeThirdPlace: true },
        qualifiers: {},
      },
    }));

  await prisma.phase.update({
    where: { id: knockout.id },
    data: { qualifiers: qualifiers.map((q) => ({ teamId: q.teamId, teamName: q.teamName, label: q.label })) },
  });

  const draft = generateBracket(
    qualifiers.map((q) => ({ teamId: q.teamId, teamName: q.teamName, label: q.label })),
    { leg: "SIMPLE", includeThirdPlace: true }
  );
  const scheduled = scheduleKnockout(
    draft.matches.map((m) => ({ order: m.order, legIndex: m.legIndex, round: m.round })),
    { venues: ["Cancha Central", "Cancha Secundaria"], startDate: new Date(), startTime: "10:00", gapMinutes: 90 }
  );

  const created = new Map<string, { id: string; round: number; order: number; legIndex: number }>();
  for (const m of draft.matches) {
    const sched = scheduled.find((s) => s.order === m.order && s.legIndex === m.legIndex);
    const match = await prisma.match.create({
      data: {
        tournamentId: tournament!.id,
        categoryId,
        phaseId: knockout.id,
        order: m.order,
        jornada: m.round,
        homeTeamId: m.homeTeamId ?? null,
        awayTeamId: m.awayTeamId ?? null,
        homeLabel: m.homeLabel ?? null,
        awayLabel: m.awayLabel ?? null,
        scheduledAt: sched?.scheduledAt ?? null,
        venue: sched?.venue ?? null,
        status: "PROGRAMADO",
      },
      select: { id: true },
    });
    created.set(`${m.round}:${m.order}:${m.legIndex}`, { id: match.id, round: m.round, order: m.order, legIndex: m.legIndex });
  }

  for (const m of draft.matches) {
    const record = created.get(`${m.round}:${m.order}:${m.legIndex}`);
    if (!record) continue;
    const homePrev = m.homeFeedFrom ? created.get(`${m.homeFeedFrom.round}:${m.homeFeedFrom.order}:${m.homeFeedFrom.legIndex}`) : null;
    const awayPrev = m.awayFeedFrom ? created.get(`${m.awayFeedFrom.round}:${m.awayFeedFrom.order}:${m.awayFeedFrom.legIndex}`) : null;
    if (homePrev) {
      const field = m.homeFeedFrom?.slot === "homeLoser" ? { homeLoserPreviousMatchId: homePrev.id } : { homePreviousMatchId: homePrev.id };
      await prisma.match.update({ where: { id: record.id }, data: field });
    }
    if (awayPrev) {
      const field = m.awayFeedFrom?.slot === "awayLoser" ? { awayLoserPreviousMatchId: awayPrev.id } : { awayPreviousMatchId: awayPrev.id };
      await prisma.match.update({ where: { id: record.id }, data: field });
    }
  }

  await prisma.phase.update({ where: { id: knockout.id }, data: { status: "EN_PROGRESO" } });

  const semis = draft.matches.filter((m) => m.round === 1);
  const teamsById = new Map(Object.values(teams).map((t) => [t.id, t]));
  const semiMatches = await prisma.match.findMany({ where: { phaseId: knockout.id, jornada: 1 } });
  for (const m of semiMatches) {
    const draftInfo = semis.find((d) => d.order === m.order);
    if (!draftInfo) continue;
    const homeTeamId = draftInfo.homeTeamId ?? null;
    const awayTeamId = draftInfo.awayTeamId ?? null;
    if (!homeTeamId || !awayTeamId) continue;
    const strengthHome = VARONES_TEAMS.find((t) => t.name === teamsById.get(homeTeamId)?.name)?.strength ?? 1;
    const strengthAway = VARONES_TEAMS.find((t) => t.name === teamsById.get(awayTeamId)?.name)?.strength ?? 2;
    const [hs, as] = scoreFor(strengthHome, strengthAway);
    await finishMatch(m.id, hs, as);
  }
}

async function computeGroupQualifiers(phaseId: string) {
  const matches = await prisma.match.findMany({
    where: { phaseId, status: "FINALIZADO" },
    include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
  });
  const groups = await prisma.group.findMany({
    where: { phaseId },
    include: { members: { include: { team: true } } },
  });
  const qualifiers: { teamId: string; teamName: string; label: string }[] = [];
  for (const group of groups) {
    const points = new Map<string, number>();
    for (const m of matches) {
      if (m.homeTeamId) {
        points.set(m.homeTeamId, (points.get(m.homeTeamId) ?? 0) + ((m.homeScore ?? 0) > (m.awayScore ?? 0) ? 3 : (m.homeScore ?? 0) === (m.awayScore ?? 0) ? 1 : 0));
      }
      if (m.awayTeamId) {
        points.set(m.awayTeamId, (points.get(m.awayTeamId) ?? 0) + ((m.awayScore ?? 0) > (m.homeScore ?? 0) ? 3 : (m.homeScore ?? 0) === (m.awayScore ?? 0) ? 1 : 0));
      }
    }
    const ordered = group.members.map((m) => m.teamId).sort((a, b) => (points.get(b) ?? 0) - (points.get(a) ?? 0));
    if (ordered.length < 2) continue;
    const names = new Map(group.members.map((m) => [m.teamId, m.team!.name]));
    qualifiers.push(
      { teamId: ordered[0], teamName: names.get(ordered[0]) ?? "—", label: `1° ${group.name}` },
      { teamId: ordered[1], teamName: names.get(ordered[1]) ?? "—", label: `2° ${group.name}` }
    );
  }
  return qualifiers;
}

async function setupDamas(categoryId: string, teams: Record<string, { id: string; name: string }>) {
  const tournament = await prisma.tournament.findFirst({
    where: { categories: { some: { id: categoryId } } },
  });
  if (!tournament) throw new Error("Torneo no encontrado");

  const phase = await prisma.phase.findFirst({
    where: { categoryId, type: "LLAVES" },
    include: { matches: true },
  });
  if (phase && phase.matches.length > 0) {
    console.log("Damas: las llaves ya tienen partidos; se omite regenerar.");
    return;
  }

  const roster = [
    { teamId: teams["Las Panteras"].id, teamName: "Las Panteras" },
    { teamId: teams["Furia Verde"].id, teamName: "Furia Verde" },
  ];

  const finalPhase =
    phase ??
    (await prisma.phase.create({
      data: {
        categoryId,
        name: "Final Damas",
        type: "LLAVES",
        position: 0,
        status: "PENDIENTE",
        config: { leg: "SIMPLE", includeThirdPlace: false },
        qualifiers: roster.map((t) => ({ teamId: t.teamId, teamName: t.teamName })),
      },
    }));

  const qualifiers = roster.map((t) => ({ teamId: t.teamId, teamName: t.teamName }));
  const draft = generateBracket(qualifiers, { leg: "SIMPLE", includeThirdPlace: false });
  const scheduled = scheduleKnockout(
    draft.matches.map((m) => ({ order: m.order, legIndex: m.legIndex })),
    { venues: ["Cancha Central"], startDate: new Date(), startTime: "18:00", gapMinutes: 60 }
  );

  const created: Record<string, string> = {};
  for (const m of draft.matches) {
    const sched = scheduled.find((s) => s.order === m.order && s.legIndex === m.legIndex);
    const match = await prisma.match.create({
      data: {
        tournamentId: tournament.id,
        categoryId,
        phaseId: finalPhase.id,
        order: m.order,
        jornada: m.round,
        homeTeamId: m.homeTeamId ?? null,
        awayTeamId: m.awayTeamId ?? null,
        homeLabel: m.homeLabel ?? null,
        awayLabel: m.awayLabel ?? null,
        scheduledAt: sched?.scheduledAt ?? null,
        venue: sched?.venue ?? null,
        status: "PROGRAMADO",
      },
      select: { id: true },
    });
    created[`${m.round}:${m.order}:${m.legIndex}`] = match.id;
  }

  await prisma.phase.update({ where: { id: finalPhase.id }, data: { status: "EN_PROGRESO" } });

  const finalMatchId = created["1:0:0"];
  if (finalMatchId) {
    const winnerId = teams["Las Panteras"].id;
    await prisma.match.update({
      where: { id: finalMatchId },
      data: {
        status: "FINALIZADO",
        homeScore: 4,
        awayScore: 2,
        winnerId,
        startedAt: new Date(),
        endedAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    await prisma.category.update({
      where: { id: categoryId },
      data: { championTeamId: winnerId },
    });
    await prisma.phase.update({ where: { id: finalPhase.id }, data: { status: "FINALIZADO" } });
    await addEvents(finalMatchId, winnerId, 4, 2);
  }
}

async function finishMatch(matchId: string, homeScore: number, awayScore: number) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) return;
  const winnerId = homeScore > awayScore ? match.homeTeamId : match.awayTeamId;
  await prisma.match.update({
    where: { id: matchId },
    data: {
      status: "FINALIZADO",
      homeScore,
      awayScore,
      winnerId,
      startedAt: match.scheduledAt ?? new Date(),
      endedAt: new Date((match.scheduledAt ?? new Date()).getTime() + 30 * 60 * 1000),
    },
  });
  if (!winnerId) return;
  const nexts = await prisma.match.findMany({
    where: { OR: [{ homePreviousMatchId: matchId }, { awayPreviousMatchId: matchId }] },
  });
  for (const next of nexts) {
    await prisma.match.update({
      where: { id: next.id },
      data: {
        homeTeamId: next.homePreviousMatchId === matchId ? winnerId : next.homeTeamId,
        awayTeamId: next.awayPreviousMatchId === matchId ? winnerId : next.awayTeamId,
        homeLabel: next.homePreviousMatchId === matchId ? null : next.homeLabel,
        awayLabel: next.awayPreviousMatchId === matchId ? null : next.awayLabel,
      },
    });
  }
}

async function addEvents(matchId: string, winnerId: string | null, homeScore: number, awayScore: number) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || !winnerId) return;
  const scorer = await prisma.player.findFirst({
    where: { teamId: winnerId },
    select: { id: true, name: true },
    orderBy: { jerseyNumber: "asc" },
  });
  const rosterPlayers = await prisma.player.findMany({
    where: { teamId: winnerId },
    select: { id: true },
    orderBy: { jerseyNumber: "asc" },
  });
  if (!scorer || rosterPlayers.length === 0) return;
  const goals = Math.max(homeScore, awayScore);
  const events: Prisma.MatchEventCreateManyInput[] = [];
  for (let i = 0; i < goals; i++) {
    const p = rosterPlayers[i % rosterPlayers.length];
    events.push({ matchId, teamId: winnerId, playerId: p.id, type: "GOL", minute: 3 + i * 4 });
  }
  events.push({ matchId, teamId: winnerId, playerId: scorer.id, type: "AMARILLA", minute: 25 });
  await prisma.matchEvent.createMany({ data: events });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());