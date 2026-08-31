"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLiveMatch } from "@/hooks/useLiveMatch";
import type { getMatchLive } from "@/lib/services/match-live";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import {
  startMatch,
  pauseMatch,
  resumeMatch,
  finishMatch,
  addMatchEvent,
  removeLastEvent,
  setManualResult,
  recordPenalty,
  deleteLastPenalty,
  revertMatch,
} from "@/lib/actions/match-actions";
import { getPlayers } from "@/lib/actions/player-actions";

type Live = NonNullable<Awaited<ReturnType<typeof getMatchLive>>>;
type PlayerRow = { id: string; name: string; jerseyNumber: number | null; teamId: string };
const eventType = ["GOL", "AMARILLA", "ROJA", "CAMBIO"] as const;

export function LiveMatchView({ matchId, viewer = false }: { matchId: string; viewer?: boolean }) {
  const router = useRouter();
  const fetcher = useCallback(
    async () => {
      const res = await fetch(`/api/matches/${matchId}/live`, { cache: "no-store" });
      if (!res.ok) throw new Error("not found");
      const json = (await res.json()) as { data: Live };
      return json.data;
    },
    [matchId]
  );
  const { state, refresh } = useLiveMatch<Live>(matchId, fetcher);
  const m = state;

  if (!m) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  const homeId = m.homeTeam?.id;
  const awayId = m.awayTeam?.id;
  const running = m.status === "EN_VIVO";

  const goals = (teamId: string | null | undefined) =>
    m.events.filter((e) => e.type === "GOL" && e.teamId === teamId).length;
  const scores = { home: goals(homeId), away: goals(awayId) };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {/* Tarjeta marcador */}
      <div className="bg-card rounded-xl border p-4">
        {/* Meta del partido */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
          <span className="truncate">{m.tournament?.name}</span>
          <span className="shrink-0">
            {m.phase?.name}{m.group ? ` · Grupo ${m.group.name}` : ""}
          </span>
        </div>

        {/* Equipos y marcador */}
        <div className="flex items-center justify-between gap-2">
          <TeamSide team={m.homeTeam} label={m.homeLabel} align="right" />
          <div className="flex shrink-0 flex-col items-center px-2">
            <div
              className={`font-mono text-4xl font-black tabular-nums sm:text-5xl ${
                running ? "animate-pulse text-primary" : ""
              }`}
            >
              {m.status === "FINALIZADO"
                ? `${m.homeScore ?? scores.home} - ${m.awayScore ?? scores.away}`
                : `${scores.home} - ${scores.away}`}
            </div>
            {m.status === "FINALIZADO" && (m.homePenalties != null || m.awayPenalties != null) && (
              <div className="text-xs text-muted-foreground">
                Pen: {m.homePenalties ?? 0} - {m.awayPenalties ?? 0}
              </div>
            )}
            <div className="mt-1.5">
              <StatusBadge status={m.status} />
            </div>
          </div>
          <TeamSide team={m.awayTeam} label={m.awayLabel} align="left" />
        </div>

        {/* Sede y hora */}
        <div className="mt-3 text-center text-xs text-muted-foreground">
          {m.venue || "Sin sede"} · {formatDateTime(m.scheduledAt)}
        </div>
      </div>

      {/* Controles del operador */}
      {!viewer && (
        <LiveControls
          m={m}
          homeId={homeId}
          awayId={awayId}
          onDone={refresh}
          onRefresh={router.refresh}
        />
      )}

      {/* Eventos */}
      <div className="bg-card rounded-xl border p-4">
        <h3 className="mb-3 text-sm font-semibold">Eventos del partido</h3>
        {m.events.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin eventos todavía.</p>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="w-full min-w-[320px] text-sm">
              <tbody>
                {m.events
                  .slice()
                  .reverse()
                  .map((e) => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2 pr-2 w-10">
                        <span
                          className="inline-block size-2.5 rounded-full"
                          style={{
                            background:
                              e.teamId === homeId
                                ? (m.homeTeam?.color ?? "#047857")
                                : e.teamId === awayId
                                ? (m.awayTeam?.color ?? "#0ea5e9")
                                : "#94a3b8",
                          }}
                        />
                      </td>
                      <td className="py-2 pr-3 w-14 text-xs font-bold text-muted-foreground whitespace-nowrap">
                        {minuteLabel(e)}
                      </td>
                      <td className="py-2 pr-3 font-medium whitespace-nowrap">
                        {eventLabel(e.type)}
                      </td>
                      <td className="py-2 text-muted-foreground max-w-[140px]">
                        <span className="block truncate">
                          {e.teamName && (
                            <span className="font-medium text-foreground">{e.teamName}</span>
                          )}
                          {e.playerName ? ` · ${e.playerName}` : ""}
                          {e.note ? ` · ${e.note}` : ""}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TeamSide({
  team,
  label,
  align,
}: {
  team: { name: string; color: string | null; shieldUrl: string | null } | null;
  label?: string | null;
  align: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col gap-1 ${
        align === "right" ? "items-end text-right" : "items-start text-left"
      }`}
    >
      <span
        className="size-7 rounded-full border shadow-sm"
        style={{ background: team?.color ?? "#94a3b8" }}
      />
      <p className="truncate text-xs font-bold leading-tight sm:text-sm">
        {team?.name ?? label ?? "—"}
      </p>
    </div>
  );
}

function minuteLabel(e: { minute: number | null; type: string }) {
  if (e.minute != null) return `${e.minute}′`;
  if (e.type === "INICIO") return "Inicio";
  if (e.type === "FIN") return "Fin";
  if (e.type === "PAUSA") return "Descanso";
  if (e.type === "REANUDAR") return "Reanuda";
  return "—";
}

function eventLabel(type: string) {
  const map: Record<string, string> = {
    GOL: "⚽ Gol",
    AMARILLA: "🟨 Amarilla",
    ROJA: "🟥 Roja",
    CAMBIO: "🔁 Cambio",
    INICIO: "▶ Inicio",
    FIN: "⏹ Fin",
    PAUSA: "⏸ Descanso",
    REANUDAR: "▶ Reanuda",
  };
  return map[type] ?? type;
}

function LiveControls({
  m,
  homeId,
  awayId,
  onDone,
  onRefresh,
}: {
  m: Live;
  homeId?: string;
  awayId?: string;
  onDone: () => void;
  onRefresh: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>, okMsg: string) => {
    setLoading(true);
    const res = await fn();
    setLoading(false);
    if (!res.success) {
      toast.error(res.error ?? "Error");
      return;
    }
    toast.success(okMsg);
    onDone();
    onRefresh();
  };

  return (
    <div className="bg-card rounded-xl border p-4">
      <h3 className="mb-3 text-sm font-semibold">Mesa de control</h3>

      {m.status === "PROGRAMADO" && (
        <Button
          size="lg"
          className="w-full"
          disabled={loading}
          onClick={() => run(() => startMatch(m.id), "Partido iniciado")}
        >
          ▶ Iniciar partido
        </Button>
      )}

      {(m.status === "EN_VIVO" || m.status === "DESCANSO") && (
        <div className="flex flex-col gap-3">
          {/* Botones por equipo */}
          <div className="grid grid-cols-2 gap-3">
            {homeId && (
              <TeamActions teamId={homeId} teamName={m.homeTeam?.name ?? "Local"} teamColor={m.homeTeam?.color} matchId={m.id} onDone={onDone} />
            )}
            {awayId && (
              <TeamActions teamId={awayId} teamName={m.awayTeam?.name ?? "Visita"} teamColor={m.awayTeam?.color} matchId={m.id} onDone={onDone} />
            )}
          </div>

          {/* Controles del partido */}
          <div className="flex flex-wrap gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => run(() => removeLastEvent(m.id), "Último evento quitado")}
            >
              ↩ Quitar último evento
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={loading}
              onClick={() =>
                run(
                  () => (m.status === "DESCANSO" ? resumeMatch(m.id) : pauseMatch(m.id)),
                  m.status === "DESCANSO" ? "Partido reanudado" : "Partido en descanso"
                )
              }
            >
              {m.status === "DESCANSO" ? "▶ Reanudar" : "⏸ Descanso"}
            </Button>
            <Button
              size="sm"
              disabled={loading}
              onClick={() => run(() => finishMatch(m.id), "Partido finalizado")}
            >
              ⏹ Finalizar
            </Button>
          </div>
        </div>
      )}

      {m.status === "FINALIZADO" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
            {m.winnerId ? (
              <p>
                Ganador:{" "}
                <span className="font-bold">
                  {m.winnerId === homeId ? m.homeTeam?.name : m.awayTeam?.name}
                </span>
              </p>
            ) : m.usePenalties ? (
              <p className="text-amber-600">Empate en llaves: definir por penales.</p>
            ) : (
              <p className="text-muted-foreground">Empate en fase de grupos.</p>
            )}
          </div>

          {m.usePenalties && !m.winnerId && (
            <PenaltyShootout
              matchId={m.id}
              homeId={homeId}
              awayId={awayId}
              shots={m.penaltyShots}
              onDone={onDone}
            />
          )}

          <div className="flex flex-wrap gap-2">
            <ManualResultDialog matchId={m.id} onDone={onDone} />
            <Button asChild variant="outline" size="sm">
              <a href={`/api/pdf/acta/${m.id}`} target="_blank" rel="noopener noreferrer">
                Acta (PDF)
              </a>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={loading}
              onClick={() => run(() => revertMatch(m.id), "Partido revertido")}
            >
              Reabrir partido
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function TeamActions({
  teamId,
  teamName,
  teamColor,
  matchId,
  onDone,
}: {
  teamId: string;
  teamName: string;
  teamColor?: string | null;
  matchId: string;
  onDone: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-2.5 relative overflow-hidden">
      {teamColor && (
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: teamColor }} />
      )}
      <div className="flex items-center gap-1.5 pl-1 mb-1">
        {teamColor && (
          <div className="size-3 rounded-full shrink-0 border shadow-sm" style={{ backgroundColor: teamColor }} />
        )}
        <p className="truncate text-xs font-bold text-muted-foreground uppercase tracking-wide">
          {teamName}
        </p>
      </div>
      {eventType.map((type) => (
        <EventDialog key={type} type={type} teamId={teamId} teamName={teamName} teamColor={teamColor} matchId={matchId} onDone={onDone} />
      ))}
    </div>
  );
}

function EventDialog({
  type,
  teamId,
  teamName,
  teamColor,
  matchId,
  onDone,
}: {
  type: (typeof eventType)[number];
  teamId: string;
  teamName: string;
  teamColor?: string | null;
  matchId: string;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [playerId, setPlayerId] = useState("");

  const [minute, setMinute] = useState("");

  const openDialog = async (v: boolean) => {
    setOpen(v);
    if (v) {
      setPlayerId("");
      setMinute("");
      const loaded = (await getPlayers(teamId)) as unknown as PlayerRow[];
      setPlayers(loaded);
    }
  };

  const submit = async () => {
    if (!playerId) {
      toast.error("Selecciona un jugador");
      return;
    }
    setLoading(true);
    const res = await addMatchEvent({
      matchId,
      teamId,
      playerId,
      type,
      minute: minute ? Number(minute) : undefined,
    });
    setLoading(false);
    if (!res.success) {
      toast.error(res.error ?? "No se pudo registrar");
      return;
    }
    toast.success("Registrado");
    setOpen(false);
    onDone();
  };

  const labelMap = { GOL: "⚽ Gol", AMARILLA: "🟨 Amarilla", ROJA: "🟥 Roja", CAMBIO: "🔁 Cambio" };
  const label = labelMap[type];

  return (
    <Dialog open={open} onOpenChange={openDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full justify-start text-xs">
          {label}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {label}
            <span className="text-muted-foreground font-normal">·</span>
            {teamColor && (
              <span className="size-3 rounded-full border shadow-sm" style={{ backgroundColor: teamColor }} />
            )}
            <span>{teamName}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Jugador</Label>
            <Select value={playerId} onValueChange={setPlayerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un jugador…" />
              </SelectTrigger>
              <SelectContent>
                {players.length === 0 ? (
                  <SelectItem value="__none__" disabled>Sin jugadores registrados</SelectItem>
                ) : (
                  players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.jerseyNumber != null ? ` (#${p.jerseyNumber})` : ""}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Minuto <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Input
              type="number"
              min={0}
              max={99}
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              placeholder="ej. 23"
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Guardando…" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PenaltyShootout({
  matchId,
  homeId,
  awayId,
  shots,
  onDone,
}: {
  matchId: string;
  homeId?: string;
  awayId?: string;
  shots: { teamId: string; result: string }[];
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [shooting, setShooting] = useState(homeId ?? "");
  const homeShots = shots.filter((s) => s.teamId === homeId);
  const awayShots = shots.filter((s) => s.teamId === awayId);

  const shoot = async (result: "CONVERTIDO" | "FALLADO") => {
    setLoading(true);
    const res = await recordPenalty({ matchId, teamId: shooting, result });
    setLoading(false);
    if (!res.success) {
      toast.error(res.error ?? "No se pudo registrar");
      return;
    }
    setShooting((prev) => (prev === homeId ? awayId ?? prev : homeId ?? prev));
    onDone();
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-400/40 bg-amber-50 p-3 dark:bg-amber-950/20">
      <p className="text-sm font-semibold">
        Tanda de penales
        <Badge variant="secondary" className="ml-2">
          {homeShots.length} - {awayShots.length}
        </Badge>
      </p>

      {/* Selector de equipo */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={shooting === homeId ? "default" : "outline"}
          onClick={() => setShooting(homeId ?? "")}
          disabled={!homeId}
          className="flex-1"
        >
          Local ({homeShots.length})
        </Button>
        <Button
          size="sm"
          variant={shooting === awayId ? "default" : "outline"}
          onClick={() => setShooting(awayId ?? "")}
          disabled={!awayId}
          className="flex-1"
        >
          Visita ({awayShots.length})
        </Button>
      </div>

      {/* Registro de lanzamiento */}
      <div className="flex gap-2">
        <Button size="sm" disabled={loading || !shooting} onClick={() => shoot("CONVERTIDO")} className="flex-1">
          ✓ Convertido
        </Button>
        <Button size="sm" variant="secondary" disabled={loading || !shooting} onClick={() => shoot("FALLADO")} className="flex-1">
          ✗ Fallado
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={loading || shots.length === 0}
          onClick={async () => {
            const res = await deleteLastPenalty(matchId);
            if (!res.success) {
              toast.error(res.error ?? "No se pudo quitar");
              return;
            }
            toast.success("Lanzamiento quitado");
            onDone();
          }}
        >
          ↩
        </Button>
      </div>
    </div>
  );
}

function ManualResultDialog({ matchId, onDone }: { matchId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [homeScore, setHomeScore] = useState("0");
  const [awayScore, setAwayScore] = useState("0");
  const [usePenalties, setUsePenalties] = useState(false);
  const [homePenalties, setHomePenalties] = useState("");
  const [awayPenalties, setAwayPenalties] = useState("");

  const submit = async () => {
    setLoading(true);
    const res = await setManualResult({
      matchId,
      homeScore: Number(homeScore),
      awayScore: Number(awayScore),
      usePenalties,
      homePenalties: usePenalties && homePenalties !== "" ? Number(homePenalties) : null,
      awayPenalties: usePenalties && awayPenalties !== "" ? Number(awayPenalties) : null,
    });
    setLoading(false);
    if (!res.success) {
      toast.error(res.error ?? "No se pudo guardar");
      return;
    }
    toast.success("Resultado guardado");
    setOpen(false);
    onDone();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Resultado manual
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Resultado manual (mesa)</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Local</Label>
              <Input type="number" min={0} max={99} value={homeScore} onChange={(e) => setHomeScore(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Visita</Label>
              <Input type="number" min={0} max={99} value={awayScore} onChange={(e) => setAwayScore(e.target.value)} />
            </div>
          </div>

          {/* Checkbox con Shadcn */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="usePenalties"
              checked={usePenalties}
              onCheckedChange={(v) => setUsePenalties(!!v)}
            />
            <label htmlFor="usePenalties" className="text-sm cursor-pointer select-none">
              Se definió por penales
            </label>
          </div>

          {usePenalties && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Penales local</Label>
                <Input type="number" min={0} value={homePenalties} onChange={(e) => setHomePenalties(e.target.value)} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Penales visita</Label>
                <Input type="number" min={0} value={awayPenalties} onChange={(e) => setAwayPenalties(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={submit} disabled={loading}>
            {loading ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}