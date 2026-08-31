import { SPORT_LABELS, type Sport } from "@/lib/sports";

export function SportBadge({ sport }: { sport: Sport }) {
  return (
    <span className="rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {SPORT_LABELS[sport] ?? "Otro"}
    </span>
  );
}