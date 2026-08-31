export type TeamOption = {
  id: string;
  name: string;
  color: string | null;
  status: string;
};

export type PhaseTeamInfo = { id: string; name: string; color: string | null };

export type GroupMemberRow = {
  teamId: string;
  seed: number;
  team: PhaseTeamInfo;
};

export type GroupRow = {
  id: string;
  name: string;
  position: number;
  members: GroupMemberRow[];
};

export type PhaseRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  position: number;
  config: Record<string, unknown>;
  fromPhaseId: string | null;
  fromPhase: { id: string; name: string; type: string } | null;
  groups: GroupRow[];
  _count: { matches: number };
};