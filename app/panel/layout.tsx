import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { PanelNav } from "@/components/panel/panel-nav";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const collapsedPref = (await cookies()).get("panel_nav_collapsed")?.value === "1";

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <PanelNav defaultCollapsed={collapsedPref} user={session.user} />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] sm:p-6 lg:pb-6">{children}</main>
    </div>
  );
}