import Link from "next/link";
import { Trophy } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/actions/auth-actions";
import { HeaderActions } from "./header-actions";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Trophy className="size-4" />
            </span>
            Campeonatos
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <HeaderActions isLoggedIn={!!user} />
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
      <footer className="border-t py-6">
        <div className="mx-auto w-full max-w-5xl px-4 text-center text-sm text-muted-foreground">
          {new Date().getFullYear()} · Campeonatos
        </div>
      </footer>
    </div>
  );
}