"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type PhaseOption = { id: string; label: string };

export function PhaseSwitcher({ phases, value }: { phases: PhaseOption[]; value: string }) {
  const router = useRouter();
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        const url = new URL(window.location.href);
        url.searchParams.set("phase", v);
        router.push(url.pathname + url.search);
      }}
    >
      <SelectTrigger className="w-64">
        <SelectValue placeholder="Elige una fase" />
      </SelectTrigger>
      <SelectContent>
        {phases.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}