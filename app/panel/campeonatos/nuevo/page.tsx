import { TournamentCreateForm } from "@/components/tournament/tournament-create-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewTournamentPage() {
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Nuevo campeonato</CardTitle>
          <CardDescription>Datos generales. Luego podrás agregar categorías y equipos.</CardDescription>
        </CardHeader>
        <CardContent>
          <TournamentCreateForm />
        </CardContent>
      </Card>
    </div>
  );
}
