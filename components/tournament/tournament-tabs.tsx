"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutGrid, Users, FileText, GitBranch, CalendarDays, Trophy } from "lucide-react";

const tabs = [
  { href: "", label: "Resumen", icon: LayoutGrid, exact: true },
  { href: "/categorias", label: "Categorías", icon: Users },
  { href: "/equipos", label: "Equipos", icon: Trophy },
  { href: "/reglamento", label: "Reglamento", icon: FileText },
  { href: "/fases", label: "Fases y fixture", icon: GitBranch },
  { href: "/partidos", label: "Partidos", icon: CalendarDays },
  { href: "/tabla", label: "Tabla", icon: Trophy },
];

export function TournamentTabs({ tournamentId }: { tournamentId: string }) {
  const pathname = usePathname();
  const base = `/panel/campeonatos/${tournamentId}`;
  const rest = pathname.replace(base, "");

  return (
    <div className="border-b">
      <nav className="scrollbar-none -mb-px flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const active = tab.exact ? rest === "" : rest.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={`${base}${tab.href}`}
              className={cn(
                "flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="size-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}