import { Trophy } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
          <Trophy className="size-8" />
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">Campeonatos</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Gestión de torneos deportivos con marcador en vivo
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}