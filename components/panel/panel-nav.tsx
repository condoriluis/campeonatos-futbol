"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { LayoutDashboard, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Trophy, Users, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { persistPanelNavCollapsed } from "@/lib/actions/ui-actions";

const ALL_LINKS = [
  { href: "/panel", label: "Resumen", icon: LayoutDashboard },
  { href: "/panel/campeonatos", label: "Mis campeonatos", icon: Trophy },
  { href: "/panel/usuarios", label: "Usuarios", icon: Users, adminOnly: true },
];

function isPathActive(pathname: string, href: string) {
  return pathname === href || (href !== "/panel" && pathname.startsWith(href));
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      title={collapsed ? label : undefined}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
        active ? "bg-primary text-primary-foreground" : "hover:bg-accent hover:text-accent-foreground"
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

function BrandLink({ collapsed }: { collapsed: boolean }) {
  const badge = (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <Trophy className="size-4" />
    </span>
  );
  return collapsed ? (
    <Link href="/panel" className="flex items-center justify-center" title="Campeonatos" aria-label="Campeonatos">
      {badge}
    </Link>
  ) : (
    <Link href="/panel" className="flex items-center gap-2 font-semibold">
      {badge}
      <span className="truncate">Campeonatos</span>
    </Link>
  );
}

function SignOutButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      <LogOut className="size-4" />
    </Button>
  );
}

export function PanelNav({
  defaultCollapsed = false,
  user,
}: {
  defaultCollapsed?: boolean;
  user: { name?: string | null; email?: string | null; role?: string | null };
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const links = ALL_LINKS.filter((l) => !l.adminOnly || user.role === "ADMIN");

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    void persistPanelNavCollapsed(next ? "1" : "0");
  };

  const closeDrawer = () => setDrawerOpen(false);

  const railNav = (
    <nav className="flex flex-col gap-1">
      {links.map((link) => (
        <NavItem
          key={link.href}
          href={link.href}
          label={link.label}
          icon={link.icon}
          active={isPathActive(pathname, link.href)}
          collapsed={collapsed}
        />
      ))}
    </nav>
  );

  const drawerNav = (
    <nav className="flex flex-col gap-1">
      {links.map((link) => (
        <NavItem
          key={link.href}
          href={link.href}
          label={link.label}
          icon={link.icon}
          active={isPathActive(pathname, link.href)}
          collapsed={false}
          onNavigate={closeDrawer}
        />
      ))}
    </nav>
  );

  return (
    <>
      {/* Barra superior móvil */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur lg:hidden">
        <DialogPrimitive.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DialogPrimitive.Trigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menú">
              <Menu className="size-5" />
            </Button>
          </DialogPrimitive.Trigger>
          <DialogPrimitive.Portal>
            <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
            <DialogPrimitive.Content
              className="bg-background fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col gap-6 p-4 shadow-xl duration-200 data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left"
            >
              <DialogPrimitive.Title className="sr-only">Menú</DialogPrimitive.Title>
              <div className="flex items-center justify-between">
                <BrandLink collapsed={false} />
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" aria-label="Cerrar menú">
                    <X className="size-4" />
                  </Button>
                </DialogPrimitive.Close>
              </div>
              {drawerNav}
              <div className="mt-auto flex flex-col gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/" onClick={closeDrawer}>
                    Ver sitio público
                  </Link>
                </Button>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        </DialogPrimitive.Root>

        <Link href="/panel" className="min-w-0 truncate font-semibold">
          Campeonatos
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <SignOutButton />
        </div>
      </header>

      {/* Navegación inferior móvil */}
      <nav
        className="bg-background/95 fixed inset-x-0 bottom-0 z-40 flex h-16 items-stretch border-t px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Navegación principal"
      >
        {links.map((link) => {
          const active = isPathActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <link.icon className="size-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Rail lateral colapsable (desktop) */}
      <aside
        className={cn(
          "bg-card sticky top-0 hidden h-dvh flex-col border-r transition-[width] duration-200 lg:flex",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className={cn("flex h-14 items-center", collapsed ? "justify-center" : "justify-between px-3")}>
          <BrandLink collapsed={collapsed} />
          <Button
            variant="ghost"
            size="icon"
            aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
            onClick={toggleCollapsed}
            className={cn(
              "shrink-0",
              collapsed && "absolute top-2 right-[-0.75rem] z-10 size-6 rounded-full border bg-background shadow-sm"
            )}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">{railNav}</div>

        <div className={cn("flex flex-col gap-2 pb-4", collapsed ? "items-center px-0" : "px-3")}>
          {!collapsed && (
            <div className="mb-2 flex flex-col gap-0.5 rounded-lg border bg-accent/50 px-3 py-2 text-xs">
              <span className="font-semibold truncate">{user.name}</span>
              <span className="text-muted-foreground truncate">{user.email}</span>
              <span className="mt-1 font-medium capitalize text-primary">{user.role?.toLowerCase()}</span>
            </div>
          )}
          {!collapsed && (
            <Button asChild variant="outline" size="sm">
              <Link href="/">Ver sitio público</Link>
            </Button>
          )}
          {collapsed && (
            <Button asChild variant="ghost" size="icon" title="Ver sitio público" aria-label="Ver sitio público">
              <Link href="/">
                <Trophy className="size-4" />
              </Link>
            </Button>
          )}
          <div className={cn("flex items-center gap-1", collapsed && "flex-col")}>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </aside>
    </>
  );
}