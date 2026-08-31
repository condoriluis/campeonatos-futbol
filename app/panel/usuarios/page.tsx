import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listUsers, getCurrentUser } from "@/lib/actions/auth-actions";
import { UserManager, type UserRow } from "@/components/admin/user-manager";


export default async function UsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/panel");

  const me = await getCurrentUser();
  const users = (await listUsers()) as unknown as UserRow[];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-heading text-2xl font-bold">Usuarios</h1>
        <p className="text-muted-foreground text-sm">Solo el administrador gestiona cuentas.</p>
      </div>
      <UserManager users={users} selfId={me?.id ?? session.user.id ?? ""} />
    </div>
  );
}
