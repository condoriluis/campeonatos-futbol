import { redirect } from "next/navigation";
import { hasUsers, registerUser } from "@/lib/actions/auth-actions";
import RegisterForm from "./register-form";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await hasUsers()) redirect("/login");

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">Primer paso: crea el administrador</h2>
        <p className="text-muted-foreground text-sm">
          Este sistema aún no tiene usuarios. Regístrate como administrador del torneo.
        </p>
      </div>
      <RegisterForm onRegister={registerUser} />
    </div>
  );
}